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
import { indexPatternFieldEditorPluginMock } from '../../index_pattern_field_editor/public/mocks';
import {
  IndexPatternManagementSetup,
  IndexPatternManagementStart,
  IndexPatternManagementPlugin,
} from './plugin';
import { IndexPatternManagmentContext } from './types';

const createSetupContract = (): IndexPatternManagementSetup => ({
  creation: {
    addCreationConfig: jest.fn(),
  } as any,
  list: {
    addListConfig: jest.fn(),
  } as any,
  environment: {
    update: jest.fn(),
  },
});

const createStartContract = (): IndexPatternManagementStart => ({
  creation: {
    getType: jest.fn(),
    getIndexPatternCreationOptions: jest.fn(),
  } as any,
  list: {
    getIndexPatternTags: jest.fn(),
    getFieldInfo: jest.fn(),
    areScriptedFieldsEnabled: jest.fn(),
  } as any,
});

const createInstance = async () => {
  const plugin = new IndexPatternManagementPlugin({} as PluginInitializerContext);

  const setup = plugin.setup(coreMock.createSetup(), {
    management: managementPluginMock.createSetupContract(),
    urlForwarding: urlForwardingPluginMock.createSetupContract(),
  });
  const doStart = () =>
    plugin.start(coreMock.createStart(), {
      data: dataPluginMock.createStartContract(),
      indexPatternFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
    });

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
  } as any,
};

const createIndexPatternManagmentContext = (): {
  [key in keyof IndexPatternManagmentContext]: any;
} => {
  const { chrome, application, uiSettings, notifications, overlays } = coreMock.createStart();
  const { http } = coreMock.createSetup();
  const data = dataPluginMock.createStartContract();
  const indexPatternFieldEditor = indexPatternFieldEditorPluginMock.createStartContract();

  return {
    chrome,
    application,
    uiSettings,
    notifications,
    overlays,
    http,
    docLinks,
    data,
    indexPatternFieldEditor,
    indexPatternManagementStart: createStartContract(),
    setBreadcrumbs: () => {},
    getMlCardState: () => 2,
    fieldFormatEditors: indexPatternFieldEditor.fieldFormatEditors,
  };
};

export const mockManagementPlugin = {
  createSetupContract,
  createStartContract,
  createInstance,
  createIndexPatternManagmentContext,
};
