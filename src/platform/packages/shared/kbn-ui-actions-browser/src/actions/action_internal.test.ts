/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { ActionDefinition } from './action';
import { ActionInternal } from './action_internal';

const defaultActionDef: ActionDefinition = {
  id: 'test-action',
  execute: jest.fn(),
};

describe('ActionInternal', () => {
  const notificationsMock = notificationServiceMock.createStartContract();
  const addWarningToastSpy = jest.spyOn(notificationsMock.toasts, 'addWarning');

  const getNotificationsService = () => notificationsMock;

  test('can instantiate from action definition', () => {
    const action = new ActionInternal(defaultActionDef, getNotificationsService);
    expect(action.id).toBe('test-action');
  });

  describe('displays toasts when execute function throws', () => {
    beforeEach(() => {
      addWarningToastSpy.mockReset();
    });

    test('execute function is sync', async () => {
      const action = new ActionInternal(
        {
          id: 'test-action',
          execute: () => {
            throw new Error('');
          },
        },
        getNotificationsService
      );
      await action.execute({});
      expect(addWarningToastSpy).toBeCalledTimes(1);
    });

    test('execute function is async', async () => {
      const action = new ActionInternal(
        {
          id: 'test-action',
          execute: async () => {
            throw new Error('');
          },
        },
        getNotificationsService
      );
      await action.execute({});
      expect(addWarningToastSpy).toBeCalledTimes(1);
    });
  });
});
