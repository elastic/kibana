/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { DataPublicPluginStart } from '../../../data/public';
import { DataView } from '../../../data_views/public';
import { ControlInput } from '../types';

export interface ControlsDataService {
  fetchFieldRange: (
    dataView: DataView,
    fieldName: string,
    input: ControlInput
  ) => Promise<{ min: number; max: number }>;
  fetchFieldRange$: (
    dataView: DataView,
    fieldName: string,
    input: ControlInput
  ) => Observable<{ min?: number; max?: number }>;
  getDataView: DataPublicPluginStart['dataViews']['get'];
  getDataView$: (id: string) => Observable<DataView>;
  autocomplete: DataPublicPluginStart['autocomplete'];
  query: DataPublicPluginStart['query'];
}
