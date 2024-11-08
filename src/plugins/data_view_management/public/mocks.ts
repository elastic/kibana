/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { noDataPagePublicMock } from '@kbn/no-data-page-plugin/public/mocks';
import { urlForwardingPluginMock } from '@kbn/url-forwarding-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { indexPatternEditorPluginMock } from '@kbn/data-view-editor-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { savedObjectsManagementPluginMock } from '@kbn/saved-objects-management-plugin/public/mocks';
import {
  IndexPatternManagementSetup,
  IndexPatternManagementStart,
  IndexPatternManagementPlugin,
} from './plugin';
import { IndexPatternManagmentContext } from './types';

const coreSetup = coreMock.createSetup();
const coreStart = coreMock.createStart();

const createSetupContract = (): IndexPatternManagementSetup => ({});

const createStartContract = (): IndexPatternManagementStart => ({});

const createInstance = async () => {
  const plugin = new IndexPatternManagementPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreSetup, {
    management: managementPluginMock.createSetupContract(),
    urlForwarding: urlForwardingPluginMock.createSetupContract(),
    noDataPage: noDataPagePublicMock.createSetup(),
  });
  const doStart = () => plugin.start();

  return {
    plugin,
    setup,
    doStart,
  };
};

const docLinks = {
  ELASTIC_WEBSITE_URL: 'htts://jestTest.elastic.co',
  DOC_LINK_VERSION: 'jest',
  links: {
    indexPatterns: {},
    scriptedFields: {},
    runtimeFields: {},
  } as any,
};

const createIndexPatternManagmentContext = (): {
  [key in keyof IndexPatternManagmentContext]: any;
} => {
  const data = dataPluginMock.createStartContract();
  const dataViewFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();
  const dataViews = dataViewPluginMocks.createStartContract();
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  const savedObjectsManagement = savedObjectsManagementPluginMock.createStartContract();

  return {
    ...coreStart,
    docLinks,
    data,
    dataViews,
    dataViewMgmtService: jest.fn(),
    noDataPage: noDataPagePublicMock.createStart(),
    unifiedSearch,
    dataViewFieldEditor,
    indexPatternManagementStart: createStartContract(),
    setBreadcrumbs: () => {},
    fieldFormatEditors: dataViewFieldEditor.fieldFormatEditors,
    IndexPatternEditor:
      indexPatternEditorPluginMock.createStartContract().IndexPatternEditorComponent,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    savedObjectsManagement,
  };
};

export const mockManagementPlugin = {
  createSetupContract,
  createStartContract,
  createInstance,
  createIndexPatternManagmentContext,
};
