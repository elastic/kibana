/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { lastValueFrom } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { getUnifiedDocViewerServices } from '../plugin';

type RequestBody = estypes.SearchRequest;

export interface EsDocSearchProps {
  /**
   * Id of the doc in ES
   */
  id: string;
  /**
   * Index in ES to query
   */
  index: string | undefined;
  /**
   * DataView entity
   */
  dataView: DataView;
  /**
   * Record fetched from ES|QL query
   */
  esqlHit?: DataTableRecord;
  /**
   * An optional callback that will be called before fetching the doc
   */
  onBeforeFetch?: () => Promise<void>;
  /**
   * An optional callback that will be called after fetching the doc
   * @param record
   */
  onProcessRecord?: (record: DataTableRecord) => DataTableRecord;
  /**
   * Skip fetching when data is already available (e.g. from cache)
   */
  skip?: boolean;
}

/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export function useEsDocSearch({
  id,
  index,
  dataView,
  esqlHit,
  onBeforeFetch,
  onProcessRecord,
  skip = false,
}: EsDocSearchProps): [ElasticRequestState, DataTableRecord | null, () => void] {
  const [status, setStatus] = useState(
    skip ? ElasticRequestState.Found : ElasticRequestState.Loading
  );
  const [hit, setHit] = useState<DataTableRecord | null>(null);
  const { data, analytics } = getUnifiedDocViewerServices();

  const requestData = useCallback(async () => {
    if (!index) {
      return;
    }

    const singleDocFetchingStartTime = window.performance.now();
    try {
      if (onBeforeFetch) {
        await onBeforeFetch();
      }
      const result = await lastValueFrom(
        data.search.search({
          params: {
            index: dataView.getIndexPattern(),
            ...buildSearchBody(id, index, dataView),
          },
        })
      );
      const rawResponse = result.rawResponse;

      const hits = rawResponse.hits;

      if (hits?.hits?.[0]) {
        setStatus(ElasticRequestState.Found);
        const record = buildDataTableRecord(hits?.hits?.[0], dataView);
        setHit(onProcessRecord ? onProcessRecord(record) : record);
      } else {
        setStatus(ElasticRequestState.NotFound);
      }
    } catch (err) {
      if (err.savedObjectId) {
        setStatus(ElasticRequestState.NotFoundDataView);
      } else if (err.status === 404) {
        setStatus(ElasticRequestState.NotFound);
      } else {
        setStatus(ElasticRequestState.Error);
      }
    }

    if (analytics) {
      const singleDocFetchingDuration = window.performance.now() - singleDocFetchingStartTime;
      reportPerformanceMetricEvent(analytics, {
        eventName: 'discoverSingleDocFetch',
        duration: singleDocFetchingDuration,
      });
    }
  }, [analytics, data.search, dataView, id, index, onBeforeFetch, onProcessRecord]);

  useEffect(() => {
    if (skip) {
      return;
    }
    if (esqlHit) {
      setStatus(ElasticRequestState.Found);
      setHit(esqlHit);
    } else {
      requestData();
    }
  }, [id, requestData, esqlHit, skip]);

  return [status, hit, requestData];
}

/**
 * helper function to build a query body for Elasticsearch
 * https://www.elastic.co/guide/en/elasticsearch/reference/current//query-dsl-ids-query.html
 */
export function buildSearchBody(id: string, index: string, dataView: DataView): RequestBody {
  const computedFields = dataView.getComputedFields();
  const runtimeFields = computedFields.runtimeFields as estypes.MappingRuntimeFields;
  const request: RequestBody = {
    query: {
      bool: {
        filter: [{ ids: { values: [id] } }, { term: { _index: index } }],
      },
    },
    stored_fields: ['*'],
    script_fields: computedFields.scriptFields,
    version: true,
    _source: true,
    runtime_mappings: runtimeFields ? runtimeFields : {},
    fields: [{ field: '*', include_unmapped: true }, ...(computedFields.docvalueFields || [])],
  };
  return request;
}
