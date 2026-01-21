/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreLifecycleMock } from '@kbn/core-lifecycle-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { navigationPluginMock } from '@kbn/navigation-plugin/public/mocks';
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { workflowsExtensionsMock } from '@kbn/workflows-extensions/public/mocks';

export const createStartServicesMock = () => ({
  ...coreLifecycleMock.createCoreStart(),
  navigation: navigationPluginMock.createStartContract(),
  serverless: serverlessMock.createStart(),
  storage: new Storage(localStorage),
  dataViews: dataViewPluginMocks.createStartContract(),
  fieldFormats: fieldFormatsServiceMock.createStartContract(),
  unifiedSearch: unifiedSearchPluginMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  spaces: spacesPluginMock.createStartContract(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
  workflowsExtensions: workflowsExtensionsMock.createStart(),
  licensing: licensingMock.createStart(),
  workflowsManagement: {
    telemetry: {
      reportEvent: jest.fn(),
    },
  },
});
