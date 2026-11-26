/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
import { of } from 'rxjs';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { chromeServiceMock, coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { IUiSettingsClient, ToastsStart } from '@kbn/core/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

export function createServicesMock() {
  const expressionsPlugin = expressionsPluginMock.createStartContract();

  expressionsPlugin.run = vi.fn(() =>
    of({
      partial: false,
      result: {
        rows: [],
      },
    })
  ) as unknown as typeof expressionsPlugin.run;

  const corePluginMock = coreMock.createStart();

  // Merged into coreMock's Jest-typed uiSettings, so these keep Jest's mock types (the `jest`
  // global maps to `vi` under Vitest).
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

  const theme = themeServiceMock.createSetupContract({ darkMode: false, name: 'borealis' });
  corePluginMock.theme = theme;

  const dataPlugin = dataPluginMock.createStartContract();

  return {
    core: corePluginMock,
    chrome: chromeServiceMock.createStartContract(),
    history: () => ({
      location: {
        search: '',
      },
      listen: vi.fn() as Mock,
    }),
    fieldFormats: fieldFormatsMock,
    filterManager: vi.fn() as Mock,
    inspector: {
      open: vi.fn() as Mock,
    },
    uiActions: uiActionsPluginMock.createStartContract(),
    uiSettings: uiSettingsMock as IUiSettingsClient,
    http: {
      basePath: '/',
    },
    dataViewEditor: {
      openEditor: vi.fn() as Mock,
      userPermissions: {
        editDataView: vi.fn(() => true),
      },
    },
    dataViewFieldEditor: {
      openEditor: vi.fn(),
      userPermissions: {
        editIndexPattern: vi.fn(() => true),
      },
    } as unknown as DataViewFieldEditorStart,
    theme,
    storage: {
      clear: vi.fn() as Mock,
      get: vi.fn() as Mock,
      set: vi.fn() as Mock,
      remove: vi.fn() as Mock,
    },
    toastNotifications: {
      addInfo: vi.fn(),
      addWarning: vi.fn(),
      addDanger: vi.fn(),
      addSuccess: vi.fn(),
    } as unknown as ToastsStart,
    expressions: expressionsPlugin,
    savedObjectsTagging: {
      ui: {
        getTagIdsFromReferences: vi.fn().mockResolvedValue([]) as Mock,
        updateTagsReferences: vi.fn() as Mock,
      },
    },
    dataViews: vi.fn() as Mock,
    locator: {
      useUrl: vi.fn(() => ''),
      navigate: vi.fn() as Mock,
      getUrl: vi.fn(() => Promise.resolve('')),
    },
    contextLocator: { getRedirectUrl: vi.fn(() => '') },
    singleDocLocator: { getRedirectUrl: vi.fn(() => '') },
    data: dataPlugin,
  };
}

export const servicesMock = createServicesMock();
