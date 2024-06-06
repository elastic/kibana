/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreStart, CoreSetup } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { setKibanaServices } from './kibana_services';

interface ESQLDataGridPluginStart {
  data: DataPublicPluginStart;
  uiActions: UiActionsStart;
  fieldFormats: FieldFormatsStart;
}
export class ESQLDataGridPlugin implements Plugin<{}, void> {
  public setup(_: CoreSetup, {}: {}) {
    return {};
  }

  public start(core: CoreStart, { data, uiActions, fieldFormats }: ESQLDataGridPluginStart): void {
    setKibanaServices(core, data, uiActions, fieldFormats);
  }

  public stop() {}
}
