/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { type IndicesAutocompleteResult, REGISTRY_EXTENSIONS_ROUTE } from '@kbn/esql-types';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';

import type { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { registerESQLEditorAnalyticsEvents } from '@kbn/esql-editor';
import { registerIndexEditorActions, registerIndexEditorAnalyticsEvents } from '@kbn/index-editor';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import {
  ESQL_CONTROL_TRIGGER,
  esqlControlTrigger,
} from './triggers/esql_controls/esql_control_trigger';
import {
  UPDATE_ESQL_QUERY_TRIGGER,
  updateESQLQueryTrigger,
} from './triggers/update_esql_query/update_esql_query_trigger';
import { ACTION_CREATE_ESQL_CONTROL, ACTION_UPDATE_ESQL_QUERY } from './triggers/constants';
import { setKibanaServices } from './kibana_services';
import { cacheNonParametrizedAsyncFunction, cacheParametrizedAsyncFunction } from './util/cache';
import { EsqlVariablesService } from './variables_service';

interface EsqlPluginSetupDependencies {
  uiActions: UiActionsSetup;
}

interface EsqlPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  licensing?: LicensingPluginStart;
  usageCollection?: UsageCollectionStart;
  // LOOKUP JOIN deps
  share: SharePluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fileUpload: FileUploadPluginStart;
}

export interface EsqlPluginStart {
  getJoinIndicesAutocomplete: (remoteClusters?: string) => Promise<IndicesAutocompleteResult>;
  getTimeseriesIndicesAutocomplete: () => Promise<IndicesAutocompleteResult>;
  getInferenceEndpointsAutocomplete?: (
    taskType: InferenceTaskType
  ) => Promise<InferenceEndpointsAutocompleteResult>;
  variablesService: EsqlVariablesService;
}

export class EsqlPlugin implements Plugin<{}, EsqlPluginStart> {
  public setup(core: CoreSetup, { uiActions }: EsqlPluginSetupDependencies) {
    uiActions.registerTrigger(updateESQLQueryTrigger);
    uiActions.registerTrigger(esqlControlTrigger);

    registerESQLEditorAnalyticsEvents(core.analytics);
    registerIndexEditorAnalyticsEvents(core.analytics);

    return {};
  }

  public start(
    core: CoreStart,
    {
      dataViews,
      expressions,
      data,
      uiActions,
      fieldsMetadata,
      usageCollection,
      licensing,
      fileUpload,
      fieldFormats,
      share,
    }: EsqlPluginStartDependencies
  ): EsqlPluginStart {
    const storage = new Storage(localStorage);

    // Register triggers
    uiActions.addTriggerActionAsync(
      UPDATE_ESQL_QUERY_TRIGGER,
      ACTION_UPDATE_ESQL_QUERY,
      async () => {
        const { UpdateESQLQueryAction } = await import(
          './triggers/update_esql_query/update_esql_query_actions'
        );
        const appendESQLAction = new UpdateESQLQueryAction(data);
        return appendESQLAction;
      }
    );

    uiActions.addTriggerActionAsync(ESQL_CONTROL_TRIGGER, ACTION_CREATE_ESQL_CONTROL, async () => {
      const { CreateESQLControlAction } = await import(
        './triggers/esql_controls/esql_control_action'
      );
      const createESQLControlAction = new CreateESQLControlAction(
        core,
        data.search.search,
        data.query.timefilter.timefilter
      );
      return createESQLControlAction;
    });

    /** Async register the index editor UI actions */
    registerIndexEditorActions({
      data,
      coreStart: core,
      share,
      uiActions,
      fieldFormats,
      fileUpload,
    });

    const variablesService = new EsqlVariablesService();

    const getJoinIndicesAutocomplete = cacheParametrizedAsyncFunction(
      async (remoteClusters?: string) => {
        const query = remoteClusters ? { remoteClusters } : {};

        const result = await core.http.get<IndicesAutocompleteResult>(
          '/internal/esql/autocomplete/join/indices',
          { query }
        );

        return result;
      },
      (remoteClusters?: string) => remoteClusters || '',
      1000 * 60 * 5, // Keep the value in cache for 5 minutes
      1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
    );

    const getTimeseriesIndicesAutocomplete = cacheNonParametrizedAsyncFunction(
      async () => {
        const result = await core.http.get<IndicesAutocompleteResult>(
          '/internal/esql/autocomplete/timeseries/indices'
        );

        return result;
      },
      1000 * 60 * 5, // Keep the value in cache for 5 minutes
      1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
    );

    const getEditorExtensionsAutocomplete = async (
      queryString: string,
      activeSolutionId: SolutionId
    ) => {
      const result = await core.http.get(
        `${REGISTRY_EXTENSIONS_ROUTE}${activeSolutionId}/${queryString}`
      );
      return result;
    };

    // Create a cached version of getEditorExtensionsAutocomplete
    const cachedGetEditorExtensionsAutocomplete = cacheParametrizedAsyncFunction(
      getEditorExtensionsAutocomplete,
      (queryString, activeSolutionId) => `${queryString}-${activeSolutionId}`,
      1000 * 60 * 5, // Keep the value in cache for 5 minutes
      1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
    );

    const getInferenceEndpointsAutocomplete = cacheParametrizedAsyncFunction(
      async (taskType: InferenceTaskType) => {
        return await core.http.get<InferenceEndpointsAutocompleteResult>(
          `/internal/esql/autocomplete/inference_endpoints/${taskType}`
        );
      },
      (taskType: InferenceTaskType) => taskType,
      1000 * 60 * 5, // Keep the value in cache for 5 minutes
      1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
    );

    const start = {
      getJoinIndicesAutocomplete,
      getTimeseriesIndicesAutocomplete,
      getEditorExtensionsAutocomplete: cachedGetEditorExtensionsAutocomplete,
      getInferenceEndpointsAutocomplete,
      variablesService,
      getLicense: async () => await licensing?.getLicense(),
    };

    setKibanaServices(
      start,
      core,
      dataViews,
      data,
      expressions,
      storage,
      uiActions,
      fieldsMetadata,
      usageCollection
    );

    return start;
  }

  public stop() {}
}
