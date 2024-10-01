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
import {
  updateESQLQueryTrigger,
  UpdateESQLQueryAction,
  UPDATE_ESQL_QUERY_TRIGGER,
} from './triggers';
import { setKibanaServices } from './kibana_services';

interface EsqlPluginStart {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  fieldsMetadata: FieldsMetadataPublicStart;
}

interface EsqlPluginSetup {
  indexManagement: IndexManagementPluginSetup;
  uiActions: UiActionsSetup;
}

export class EsqlPlugin implements Plugin<{}, void> {
  private indexManagement?: IndexManagementPluginSetup;

  public setup(_: CoreSetup, { indexManagement, uiActions }: EsqlPluginSetup) {
    this.indexManagement = indexManagement;

    uiActions.registerTrigger(updateESQLQueryTrigger);

    return {};
  }

  public start(
    core: CoreStart,
    { dataViews, expressions, data, uiActions, fieldsMetadata }: EsqlPluginStart
  ): void {
    const appendESQLAction = new UpdateESQLQueryAction(data);
    uiActions.addTriggerAction(UPDATE_ESQL_QUERY_TRIGGER, appendESQLAction);
    setKibanaServices(core, dataViews, expressions, this.indexManagement, fieldsMetadata);
  }

  public stop() {}
}
