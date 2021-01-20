/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { notificationServiceMock } from '../../../../../core/public/mocks';
import { httpServiceMock } from '../../../../../core/public/mocks';

import { HistoryMock } from '../../services/history.mock';
import { SettingsMock } from '../../services/settings.mock';
import { StorageMock } from '../../services/storage.mock';
import { createApi, createEsHostService } from '../lib';

import { ContextValue } from './services_context';

export const serviceContextMock = {
  create: (): ContextValue => {
    const storage = new StorageMock({} as any, 'test');
    const http = httpServiceMock.createSetupContract();
    const api = createApi({ http });
    const esHostService = createEsHostService({ api });
    (storage.keys as jest.Mock).mockImplementation(() => []);
    return {
      services: {
        trackUiMetric: { count: () => {}, load: () => {} },
        storage,
        esHostService,
        settings: new SettingsMock(storage),
        history: new HistoryMock(storage),
        notifications: notificationServiceMock.createSetupContract(),
        objectStorageClient: {} as any,
      },
      docLinkVersion: 'NA',
    };
  },
};
