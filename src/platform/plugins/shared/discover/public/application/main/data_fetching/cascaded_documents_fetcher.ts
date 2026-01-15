/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { constructCascadeQuery } from '@kbn/esql-utils';
import type { TimeRange } from '@kbn/es-query';
import type { CascadeQueryArgs } from '@kbn/esql-utils/src/utils/cascaded_documents_helpers';
import { apm } from '@elastic/apm-rum';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { DiscoverServices } from '../../../build_services';
import { fetchEsql } from './fetch_esql';
import type { ScopedProfilesManager } from '../../../context_awareness';

interface FetchCascadedDocumentsParams extends CascadeQueryArgs {
  rowId: string;
  timeRange: TimeRange | undefined;
}

export interface CascadedDocumentsStateManager {
  getCascadedDocuments(rowId: string): DataTableRecord[] | undefined;
  setCascadedDocuments(rowId: string, records: DataTableRecord[]): void;
}

export class CascadedDocumentsFetcher {
  private readonly abortControllers: Map<string, AbortController> = new Map();

  constructor(
    private readonly services: DiscoverServices,
    private readonly scopedProfilesManager: ScopedProfilesManager,
    private readonly stateManager: CascadedDocumentsStateManager
  ) {}

  async fetchCascadedDocuments({
    rowId,
    nodeType,
    nodePath,
    nodePathMap,
    query,
    esqlVariables,
    dataView,
    timeRange,
  }: FetchCascadedDocumentsParams) {
    this.cancelFetch(rowId);

    const existingRecords = this.stateManager.getCascadedDocuments(rowId);

    if (existingRecords) {
      return existingRecords;
    }

    const abortController = new AbortController();

    this.abortControllers.set(rowId, abortController);

    let records: DataTableRecord[] = [];

    try {
      const cascadeQuery = constructCascadeQuery({
        query,
        esqlVariables,
        dataView,
        nodeType,
        nodePath,
        nodePathMap,
      });

      if (!cascadeQuery) {
        // maybe track the inputted query, to learn about the kind of queries that bug
        apm.captureError(new Error('Failed to construct cascade query'));
        return [];
      }

      ({ records } = await fetchEsql({
        query: cascadeQuery,
        esqlVariables,
        dataView,
        data: this.services.data,
        expressions: this.services.expressions,
        abortSignal: abortController.signal,
        timeRange,
        scopedProfilesManager: this.scopedProfilesManager,
        // TODO: get inspector adapters
        inspectorAdapters: {},
        inspectorConfig: {
          title: i18n.translate('discover.dataCascade.inspector.cascadeQueryTitle', {
            defaultMessage: 'Cascade Row Data Query',
          }),
          description: i18n.translate('discover.dataCascade.inspector.cascadeQueryDescription', {
            defaultMessage:
              'This request queries Elasticsearch to fetch the documents matching the value of the expanded cascade row.',
          }),
        },
      }));

      this.stateManager.setCascadedDocuments(rowId, records);
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    } finally {
      this.abortControllers.delete(rowId);
    }

    return records;
  }

  cancelFetch(rowId: string, reason: AbortReason = AbortReason.CANCELED) {
    const abortController = this.abortControllers.get(rowId);

    if (abortController) {
      abortController.abort(reason);
      this.abortControllers.delete(rowId);
    }
  }

  cancelAllFetches(reason: AbortReason = AbortReason.CANCELED) {
    this.abortControllers.forEach((abortController) => abortController.abort(reason));
    this.abortControllers.clear();
  }
}
