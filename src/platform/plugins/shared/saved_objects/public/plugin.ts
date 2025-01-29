/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart, Plugin } from '@kbn/core/public';

import './index.scss';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { setStartServices } from './kibana_services';

export interface SavedObjectsStartDeps {
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export class SavedObjectsPublicPlugin implements Plugin<{}, {}, object, SavedObjectsStartDeps> {
  public setup() {
    return {};
  }
  public start(core: CoreStart, { data, dataViews }: SavedObjectsStartDeps) {
    setStartServices(core);
    return {};
  }
}
