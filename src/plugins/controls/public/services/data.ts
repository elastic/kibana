/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart } from '../../../data/public';

export interface ControlsDataService {
  autocomplete: DataPublicPluginStart['autocomplete'];
  query: DataPublicPluginStart['query'];
  searchSource: DataPublicPluginStart['search']['searchSource'];
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
}
