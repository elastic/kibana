/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notificationServiceMock, httpServiceMock } from 'src/core/public/mocks';
import { StorageMock } from '../../../public/services/storage.mock';
import { SettingsMock } from '../../../public/services/settings.mock';
import { createHistory } from '../../../public/services/history';
import { createApi, createEsHostService } from '../../../public/application/lib';

export const getAppContextMock = () => {
  const http = httpServiceMock.createSetupContract();
  const storage = new StorageMock(null, null);
  const settings = new SettingsMock(null);
  const history = createHistory({ storage });
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });
  const objectStorageClient = {
    text: {
      findAll: jest.fn(() => []),
      create: jest.fn(),
    },
  };

  return {
    docLinksVersion: '8.0',
    services: {
      esHostService,
      storage,
      history,
      settings,
      notifications: notificationServiceMock.createStartContract(),
      trackUiMetric: jest.fn(),
      objectStorageClient,
    },
  };
};
