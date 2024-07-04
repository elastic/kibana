/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreStart, CoreSetup } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IndexManagementPluginSetup } from '@kbn/index-management';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import {
  updateESQLQueryTrigger,
  UpdateESQLQueryAction,
  UPDATE_ESQL_QUERY_TRIGGER,
} from './triggers';
import { setKibanaServices } from './kibana_services';

interface TextBasedLanguagesPluginStart {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
}

interface TextBasedLanguagesPluginSetup {
  indexManagement: IndexManagementPluginSetup;
  uiActions: UiActionsSetup;
}

export class TextBasedLanguagesPlugin implements Plugin<{}, void> {
  private indexManagement?: IndexManagementPluginSetup;

  public setup(_: CoreSetup, { indexManagement, uiActions }: TextBasedLanguagesPluginSetup) {
    this.indexManagement = indexManagement;

    uiActions.registerTrigger(updateESQLQueryTrigger);

    return {};
  }

  public start(
    core: CoreStart,
    { dataViews, expressions, data, uiActions }: TextBasedLanguagesPluginStart
  ): void {
    const appendESQLAction = new UpdateESQLQueryAction(data);
    uiActions.addTriggerAction(UPDATE_ESQL_QUERY_TRIGGER, appendESQLAction);
    setKibanaServices(core, dataViews, expressions, this.indexManagement);
  }

  public stop() {}
}
