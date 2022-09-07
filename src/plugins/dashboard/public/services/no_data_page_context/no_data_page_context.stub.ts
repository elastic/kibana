/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { indexPatternEditorPluginMock as dataViewEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { DashboardNoDataPageContextService } from './types';

type NoDataPageContextServiceFactory = PluginServiceFactory<DashboardNoDataPageContextService>;

export const noDataPageContextServiceFactory: NoDataPageContextServiceFactory = () => {
  const corePluginMock = coreMock.createStart();
  const dataViewEditorMock = dataViewEditorPluginMock.createStartContract();

  return {
    coreStart: {
      application: {
        currentAppId$: corePluginMock.application.currentAppId$,
        navigateToUrl: corePluginMock.application.navigateToUrl,
        capabilities: {
          navLinks: corePluginMock.application.capabilities.navLinks,
        },
      },
    },
    dataViewEditor: {
      openEditor: dataViewEditorMock.openEditor,
      userPermissions: dataViewEditorMock.userPermissions,
    },
  };
};
