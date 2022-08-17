/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardDataViewEditorService } from './types';

type DataServiceFactory = PluginServiceFactory<DashboardDataViewEditorService>;

export const dataViewEditorServiceFactory: DataServiceFactory = () => {
  const pluginMock = dataViewEditorPluginMock.createStartContract();

  return {
    openEditor: pluginMock.openEditor,
    userPermissions: pluginMock.userPermissions,
  };
};
