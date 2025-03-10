/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import { savedObjectTaggingOssPluginMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import React, { useImperativeHandle } from 'react';
import { setKibanaServices } from './kibana_services';
import { DefaultPresentationPanelApi, PanelCompatibleComponent } from './panel_component/types';

export const setStubKibanaServices = () => {
  const core = coreMock.createStart();

  setKibanaServices(core, {
    uiActions: uiActionsPluginMock.createStartContract(),
    inspector: inspectorPluginMock.createStartContract(),
    savedObjectsManagement: savedObjectsManagementPluginMock.createStartContract(),
    usageCollection: { reportUiCounter: jest.fn() },
    contentManagement: contentManagementMock.createStartContract(),
    savedObjectsTaggingOss: savedObjectTaggingOssPluginMock.createStart(),
  });
};

// export const defaultApi:

export const getMockPresentationPanelCompatibleComponent = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>(
  api?: ApiType
): Promise<PanelCompatibleComponent> =>
  Promise.resolve(
    React.forwardRef((_, apiRef) => {
      useImperativeHandle(apiRef, () => api ?? { uuid: 'test' });
      return (
        <div data-test-subj="testPresentationPanelInternalComponent">This is a test component</div>
      );
    })
  );
