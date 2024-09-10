/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { chromeServiceMock, coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { IUiSettingsClient, ToastsStart } from '@kbn/core/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

export function createServicesMock() {
  const expressionsPlugin = expressionsPluginMock.createStartContract();

  expressionsPlugin.run = jest.fn(() =>
    of({
      partial: false,
      result: {
        rows: [],
      },
    })
  ) as unknown as typeof expressionsPlugin.run;

  const corePluginMock = coreMock.createStart();

  const uiSettingsMock: Partial<typeof corePluginMock.uiSettings> = {
    get: jest.fn(),
    isDefault: jest.fn((key: string) => {
      return true;
    }),
  };

  corePluginMock.uiSettings = {
    ...corePluginMock.uiSettings,
    ...uiSettingsMock,
  };

  const theme = themeServiceMock.createSetupContract({ darkMode: false });
  corePluginMock.theme = theme;

  const dataPlugin = dataPluginMock.createStartContract();

  return {
    core: corePluginMock,
    charts: chartPluginMock.createSetupContract(),
    chrome: chromeServiceMock.createStartContract(),
    history: () => ({
      location: {
        search: '',
      },
      listen: jest.fn(),
    }),
    fieldFormats: fieldFormatsMock,
    filterManager: jest.fn(),
    inspector: {
      open: jest.fn(),
    },
    uiActions: uiActionsPluginMock.createStartContract(),
    uiSettings: uiSettingsMock as IUiSettingsClient,
    http: {
      basePath: '/',
    },
    dataViewEditor: {
      openEditor: jest.fn(),
      userPermissions: {
        editDataView: jest.fn(() => true),
      },
    },
    dataViewFieldEditor: {
      openEditor: jest.fn(),
      userPermissions: {
        editIndexPattern: jest.fn(() => true),
      },
    } as unknown as DataViewFieldEditorStart,
    theme,
    storage: {
      clear: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
    toastNotifications: {
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
    } as unknown as ToastsStart,
    expressions: expressionsPlugin,
    savedObjectsTagging: {
      ui: {
        getTagIdsFromReferences: jest.fn().mockResolvedValue([]),
        updateTagsReferences: jest.fn(),
      },
    },
    dataViews: jest.fn(),
    locator: {
      useUrl: jest.fn(() => ''),
      navigate: jest.fn(),
      getUrl: jest.fn(() => Promise.resolve('')),
    },
    contextLocator: { getRedirectUrl: jest.fn(() => '') },
    singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
    data: dataPlugin,
  };
}

export const servicesMock = createServicesMock();
