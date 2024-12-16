/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreStart, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { setKibanaServices } from './kibana_services';
import { esqlControlTrigger, ESQL_CONTROL_TRIGGER } from './esql_control_trigger';
import { CreateESQLControlAction } from './esql_control_action';

interface ESQLVariablesPluginStart {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
}

interface ESQLVariablesPluginSetup {
  uiActions: UiActionsSetup;
}

export class ESQLVariablesPlugin implements Plugin<{}, void> {
  public setup(_: CoreSetup, { uiActions }: ESQLVariablesPluginSetup) {
    uiActions.registerTrigger(esqlControlTrigger);

    return {};
  }

  public start(core: CoreStart, { data, uiActions }: ESQLVariablesPluginStart): void {
    setKibanaServices(core, data, uiActions);
    const createESQLControlAction = new CreateESQLControlAction(core, data.search.search);
    uiActions.addTriggerAction(ESQL_CONTROL_TRIGGER, createESQLControlAction);
  }

  public stop() {}
}
