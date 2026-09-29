/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';

export const fatalErrorMock = fatalErrorsServiceMock.createSetupContract();
export const coreSystemMock = {
  setup: vi.fn().mockResolvedValue({
    fatalErrors: fatalErrorMock,
  }),
  start: vi.fn().mockResolvedValue({
    application: applicationServiceMock.createInternalStartContract(),
  }),
};
vi.doMock('./core_system', () => {
      const mocked = {
      CoreSystem: vi.fn().mockImplementation(() => coreSystemMock),
    };
      return { ...mocked, default: mocked };
    });

export const apmSystem = {
  setup: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
};
export const ApmSystemConstructor = vi.fn().mockImplementation(() => apmSystem);
vi.doMock('./apm_system', () => {
      const mocked = {
      ApmSystem: ApmSystemConstructor,
    };
      return { ...mocked, default: mocked };
    });

export const i18nLoad = vi.fn().mockResolvedValue(undefined);
export const i18nInitDefault = vi.fn().mockReturnValue(undefined);
export const i18nGetIsInitialized = vi.fn().mockReturnValue(false);
export const setAvailableLocalesMock = vi.fn();
vi.doMock('@kbn/i18n', async () => {
      const mocked = {
      i18n: {
        ...(await vi.importActual('@kbn/i18n')).i18n,
        load: i18nLoad,
        initDefault: i18nInitDefault,
        getIsInitialized: i18nGetIsInitialized,
      },
      setAvailableLocales: setAvailableLocalesMock,
    };
      return { ...mocked, default: mocked };
    });
