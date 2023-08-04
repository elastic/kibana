/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { of } from 'rxjs';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { savedSearchPluginMock } from '@kbn/saved-search-plugin/public/mocks';
import { chromeServiceMock, coreMock } from '@kbn/core/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { LocalStorageMock } from './local_storage_mock';
import { IUiSettingsClient, ToastsStart } from '@kbn/core/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';

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

  const theme = {
    theme$: of({ darkMode: false }),
  };

  corePluginMock.theme = theme;

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
    storage: new LocalStorageMock({}) as unknown as Storage,
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
    savedSearch: savedSearchPluginMock.createStartContract(),
    dataViews: jest.fn(),
    locator: {
      useUrl: jest.fn(() => ''),
      navigate: jest.fn(),
      getUrl: jest.fn(() => Promise.resolve('')),
    },
    contextLocator: { getRedirectUrl: jest.fn(() => '') },
    singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
  };
}

export const servicesMock = createServicesMock();
