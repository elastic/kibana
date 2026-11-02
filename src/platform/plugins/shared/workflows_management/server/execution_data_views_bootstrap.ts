/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
  WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
} from '../common';

const BOOTSTRAP_CACHE_TTL_MS = 60 * 1_000;

function isAlreadyExistsError(err: unknown): boolean {
  if ((err as { name?: string })?.name === 'DuplicateDataViewError') return true;
  const status =
    (err as { statusCode?: number })?.statusCode ??
    (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
  if (status === 409) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /version_conflict_engine_exception|document already exists/i.test(message);
}

/** Creates managed workflow execution data views for one Kibana space. */
export class ExecutionDataViewsBootstrap {
  private readonly bootstrappedSpaces = new Map<string, number>();
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(
    private readonly dataViewsPlugin: DataViewsServerPluginStart,
    private readonly logger: Logger
  ) {}

  ensureForSpaceFireAndForget(
    spaceId: string,
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ): void {
    const cached = this.bootstrappedSpaces.get(spaceId);
    if (cached !== undefined && Date.now() - cached < BOOTSTRAP_CACHE_TTL_MS) {
      return;
    }
    if (this.inFlight.has(spaceId)) {
      return;
    }

    const operation = this.ensureForSpace(spaceId, savedObjectsClient, esClient)
      .then(() => {
        this.bootstrappedSpaces.set(spaceId, Date.now());
      })
      .catch((err) => {
        this.logger.warn(
          `ExecutionDataViewsBootstrap: failed to ensure data views for space "${spaceId}": ${err}`
        );
      })
      .finally(() => {
        this.inFlight.delete(spaceId);
      });
    this.inFlight.set(spaceId, operation);
  }

  private async ensureForSpace(
    spaceId: string,
    savedObjectsClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ): Promise<void> {
    const dvService = await this.dataViewsPlugin.dataViewsServiceFactory(
      savedObjectsClient,
      esClient,
      undefined,
      true /* byPassCapabilities */
    );

    const views: Array<{ id: string; title: string; name: string }> = [
      {
        id: `workflows-executions-managed-${spaceId}`,
        title: WORKFLOWS_EXECUTIONS_DATA_VIEW_TITLE,
        name: 'Workflow executions',
      },
      {
        id: `workflows-step-executions-managed-${spaceId}`,
        title: WORKFLOWS_STEP_EXECUTIONS_DATA_VIEW_TITLE,
        name: 'Workflow step executions',
      },
    ];

    for (const { id, title, name } of views) {
      try {
        const existing = await this.getDataViewIfExists(dvService, id);
        if (existing !== null) {
          await this.alignExistingDataView(dvService, existing, title);
        } else {
          const dataView = await dvService.create(
            {
              id,
              title,
              name,
              timeFieldName: 'startedAt',
              allowNoIndex: true,
              allowHidden: true,
              managed: true,
              namespaces: [spaceId],
            },
            true /* skipFetchFields */
          );
          await dvService.createSavedObject(dataView, false /* overwrite */);
          this.logger.debug(
            `ExecutionDataViewsBootstrap: bootstrapped data view ${id} for space "${spaceId}"`
          );
        }
      } catch (err) {
        if (!isAlreadyExistsError(err)) {
          throw err;
        }
        const existing = await this.getDataViewIfExists(dvService, id);
        if (existing === null) {
          throw err;
        }
        await this.alignExistingDataView(dvService, existing, title);
      }
    }
  }

  private async alignExistingDataView(
    dataViewsService: Awaited<ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>>,
    dataView: DataView,
    title: string
  ): Promise<void> {
    const needsTitle = dataView.getIndexPattern() !== title;
    const needsAllowHidden = !dataView.getAllowHidden();
    if (!needsTitle && !needsAllowHidden) {
      this.logger.debug(`ExecutionDataViewsBootstrap: data view ${dataView.id} already exists`);
      return;
    }
    if (needsTitle) {
      dataView.setIndexPattern(title);
    }
    if (needsAllowHidden) {
      dataView.setAllowHidden(true);
    }
    await dataViewsService.updateSavedObject(dataView);
    this.logger.debug(
      `ExecutionDataViewsBootstrap: updated data view ${dataView.id} for hidden queryable indexes`
    );
  }

  private async getDataViewIfExists(
    dataViewsService: Awaited<ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>>,
    id: string
  ): Promise<DataView | null> {
    try {
      return await dataViewsService.get(id);
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ??
        (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (status === 404) {
        return null;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (/not\s+found/i.test(message)) {
        return null;
      }
      throw err;
    }
  }
}
