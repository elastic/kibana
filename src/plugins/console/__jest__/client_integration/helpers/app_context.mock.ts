/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notificationServiceMock, coreMock } from 'src/core/public/mocks';
import { createStorage } from '../../../public/services/storage';
import { createSettings } from '../../../public/services/settings';
import { createHistory } from '../../../public/services/history';
import { createApi, createEsHostService } from '../../../public/application/lib';

import { HttpSetup } from 'src/core/public';

const objectStorageClient = {
  text: {
    findAll: jest.fn(() => ['test']),
    create: jest.fn(),
    update: jest.fn(),
  },
};

export const getAppContextMock = (http: HttpSetup) => {
  const storageMock = coreMock.createStorage();

  const storage = createStorage({ engine: storageMock, prefix: '' });
  const history = createHistory({ storage });
  const settings = createSettings({ storage });
  const api = createApi({ http });
  const esHostService = createEsHostService({ api });

  return {
    docLinksVersion: '8.0',
    services: {
      storage,
      history,
      settings,
      esHostService,
      objectStorageClient,
      trackUiMetric: jest.fn(),
      notifications: notificationServiceMock.createStartContract(),
    },
  };
};
