/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardDataViewEditorService } from './types';

type DataServiceFactory = PluginServiceFactory<DashboardDataViewEditorService>;

export const dataViewEditorServiceFactory: DataServiceFactory = () => ({
  openEditor: {} as unknown as DataViewEditorStart['openEditor'],
  IndexPatternEditorComponent: {} as unknown as DataViewEditorStart['IndexPatternEditorComponent'],
  userPermissions: {} as unknown as DataViewEditorStart['userPermissions'],
});
