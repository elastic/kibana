/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '../../../../../core/public/mocks';
import { dataPluginMock } from '../../../../data/public/mocks';
import { VisualizeServices } from '../types';

export const createVisualizeServicesMock = () => {
  const coreStartMock = coreMock.createStart();
  const dataStartMock = dataPluginMock.createStartContract();
  const toastNotifications = coreStartMock.notifications.toasts;

  return {
    ...coreStartMock,
    data: dataStartMock,
    toastNotifications,
    history: {
      replace: jest.fn(),
      location: { pathname: '' },
    },
  } as unknown as jest.Mocked<VisualizeServices>;
};
