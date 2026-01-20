/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
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
import { EsqlVariablesService } from './variables_service';

interface EsqlPluginSetupDependencies {
  uiActions: UiActionsSetup;
}

interface EsqlPluginStartDependencies {
  uiActions: UiActionsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  licensing?: LicensingPluginStart;
  usageCollection?: UsageCollectionStart;
  // LOOKUP JOIN deps
  share: SharePluginStart;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fileUpload: FileUploadPluginStart;
  kql: KqlPluginStart;
}

export interface EsqlPluginStart {
  variablesService: EsqlVariablesService;
  isServerless: boolean;
}

export class EsqlPlugin implements Plugin<{}, EsqlPluginStart> {
  constructor(private readonly initContext: PluginInitializerContext) {}

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
      data,
      uiActions,
      fieldsMetadata,
      usageCollection,
      licensing,
      fileUpload,
      fieldFormats,
      share,
      kql,
    }: EsqlPluginStartDependencies
  ): EsqlPluginStart {
    const isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';

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

    const start = {
      isServerless,
      variablesService,
      getLicense: async () => await licensing?.getLicense(),
    };

    setKibanaServices(start, core, data, storage, uiActions, kql, fieldsMetadata, usageCollection);

    return start;
  }

  public stop() {}
}
