/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'src/core/public';
import { coreMock } from '../../../core/public/mocks';
import { managementPluginMock } from '../../management/public/mocks';
import { urlForwardingPluginMock } from '../../url_forwarding/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';
import { indexPatternFieldEditorPluginMock } from '../../data_view_field_editor/public/mocks';
import { indexPatternEditorPluginMock } from '../../data_view_editor/public/mocks';
import { dataViewPluginMocks } from '../../data_views/public/mocks';
import {
  IndexPatternManagementSetup,
  IndexPatternManagementStart,
  IndexPatternManagementPlugin,
} from './plugin';
import { IndexPatternManagmentContext } from './types';
import { fieldFormatsServiceMock } from '../../field_formats/public/mocks';

const createSetupContract = (): IndexPatternManagementSetup => ({});

const createStartContract = (): IndexPatternManagementStart => ({});

const createInstance = async () => {
  const plugin = new IndexPatternManagementPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup(), {
    management: managementPluginMock.createSetupContract(),
    urlForwarding: urlForwardingPluginMock.createSetupContract(),
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
  const { chrome, uiSettings, notifications, overlays } = coreMock.createStart();
  const { http } = coreMock.createSetup();
  const data = dataPluginMock.createStartContract();
  const dataViewFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();
  const dataViews = dataViewPluginMocks.createStartContract();

  return {
    chrome,
    uiSettings,
    notifications,
    overlays,
    http,
    docLinks,
    data,
    dataViews,
    dataViewFieldEditor,
    indexPatternManagementStart: createStartContract(),
    setBreadcrumbs: () => {},
    fieldFormatEditors: dataViewFieldEditor.fieldFormatEditors,
    IndexPatternEditor:
      indexPatternEditorPluginMock.createStartContract().IndexPatternEditorComponent,
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
  };
};

export const mockManagementPlugin = {
  createSetupContract,
  createStartContract,
  createInstance,
  createIndexPatternManagmentContext,
};
