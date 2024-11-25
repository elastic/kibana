/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionDefinition } from './action';
import { ActionInternal } from './action_internal';

const defaultActionDef: ActionDefinition = {
  id: 'test-action',
  execute: jest.fn(),
};

describe('ActionInternal', () => {
  test('can instantiate from action definition', () => {
    const action = new ActionInternal(defaultActionDef);
    expect(action.id).toBe('test-action');
  });

  describe('displays toasts when execute function throws', () => {
    const addWarningMock = jest.fn();
    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../services').getNotifications = () => ({
        toasts: {
          addWarning: addWarningMock,
        },
      });
    });

    beforeEach(() => {
      addWarningMock.mockReset();
    });

    test('execute function is sync', async () => {
      const action = new ActionInternal({
        id: 'test-action',
        execute: () => {
          throw new Error('');
        },
      });
      await action.execute({});
      expect(addWarningMock).toBeCalledTimes(1);
    });

    test('execute function is async', async () => {
      const action = new ActionInternal({
        id: 'test-action',
        execute: async () => {
          throw new Error('');
        },
      });
      await action.execute({});
      expect(addWarningMock).toBeCalledTimes(1);
    });
  });
});
