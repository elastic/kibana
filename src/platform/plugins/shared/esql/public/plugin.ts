/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreStart, CoreSetup } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  esqlControlTrigger,
  ESQL_CONTROL_TRIGGER,
} from './triggers/esql_controls/esql_control_trigger';
import {
  updateESQLQueryTrigger,
  UPDATE_ESQL_QUERY_TRIGGER,
} from './triggers/update_esql_query/update_esql_query_trigger';
import { ACTION_UPDATE_ESQL_QUERY, ACTION_CREATE_ESQL_CONTROL } from './triggers/constants';
import { setKibanaServices } from './kibana_services';
import { JoinIndicesAutocompleteResult } from '../common';
import { cacheNonParametrizedAsyncFunction } from './util/cache';
import { EsqlVariablesService } from './variables_service';

interface EsqlPluginSetupDependencies {
  indexManagement: IndexManagementPluginSetup;
  uiActions: UiActionsSetup;
}

interface EsqlPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  usageCollection?: UsageCollectionStart;
}

export interface EsqlPluginStart {
  getJoinIndicesAutocomplete: () => Promise<JoinIndicesAutocompleteResult>;
  variablesService: EsqlVariablesService;
}

export class EsqlPlugin implements Plugin<{}, EsqlPluginStart> {
  private indexManagement?: IndexManagementPluginSetup;

  public setup(_: CoreSetup, { indexManagement, uiActions }: EsqlPluginSetupDependencies) {
    this.indexManagement = indexManagement;

    uiActions.registerTrigger(updateESQLQueryTrigger);
    uiActions.registerTrigger(esqlControlTrigger);

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
      const createESQLControlAction = new CreateESQLControlAction(core, data.search.search);
      return createESQLControlAction;
    });

    const variablesService = new EsqlVariablesService();

    const getJoinIndicesAutocomplete = cacheNonParametrizedAsyncFunction(
      async () => {
        const result = await core.http.get<JoinIndicesAutocompleteResult>(
          '/internal/esql/autocomplete/join/indices'
        );

        return result;
      },
      1000 * 60 * 5, // Keep the value in cache for 5 minutes
      1000 * 15 // Refresh the cache in the background only if 15 seconds passed since the last call
    );

    const start = {
      getJoinIndicesAutocomplete,
      variablesService,
    };

    setKibanaServices(
      start,
      core,
      dataViews,
      data,
      expressions,
      storage,
      uiActions,
      this.indexManagement,
      fieldsMetadata,
      usageCollection
    );

    return start;
  }

  public stop() {}
}
