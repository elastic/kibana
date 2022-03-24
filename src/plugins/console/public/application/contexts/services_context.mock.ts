/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  notificationServiceMock,
  httpServiceMock,
  themeServiceMock,
  docLinksServiceMock,
} from '../../../../../core/public/mocks';

import type { ObjectStorageClient } from '../../../common/types';
import { HistoryMock } from '../../services/history.mock';
import { SettingsMock } from '../../services/settings.mock';
import { StorageMock } from '../../services/storage.mock';
import { createApi, createEsHostService } from '../lib';

import { ContextValue } from './services_context';

export const serviceContextMock = {
  create: (): ContextValue => {
    const storage = new StorageMock({} as unknown as Storage, 'test');
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
        objectStorageClient: {} as unknown as ObjectStorageClient,
      },
      docLinkVersion: 'NA',
      theme$: themeServiceMock.create().start().theme$,
      docLinks: docLinksServiceMock.createStartContract().links,
    };
  },
};
