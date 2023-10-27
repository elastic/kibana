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
import type { IndexManagementPluginSetup } from '@kbn/index-management-plugin/public';
import { setKibanaServices } from './kibana_services';

interface TextBasedLanguagesPluginStart {
  dataViews: DataViewsPublicPluginStart;
  expressions: ExpressionsStart;
}

interface TextBasedLanguagesPluginSetup {
  indexManagement: IndexManagementPluginSetup;
}

export class TextBasedLanguagesPlugin implements Plugin<{}, void> {
  private indexManagement?: IndexManagementPluginSetup;

  public setup(_: CoreSetup, { indexManagement }: TextBasedLanguagesPluginSetup) {
    this.indexManagement = indexManagement;
    return {};
  }

  public start(core: CoreStart, { dataViews, expressions }: TextBasedLanguagesPluginStart): void {
    setKibanaServices(core, dataViews, expressions, this.indexManagement);
  }

  public stop() {}
}
