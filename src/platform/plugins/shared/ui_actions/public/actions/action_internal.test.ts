/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { NotificationsStart } from '@kbn/core/public';
import type { ActionDefinition } from './action';
import { ActionInternal } from './action_internal';
import { getNotifications } from '../services';

vi.mock('../services', { spy: true });

const defaultActionDef: ActionDefinition = {
  id: 'test-action',
  execute: vi.fn(),
};

describe('ActionInternal', () => {
  test('can instantiate from action definition', () => {
    const action = new ActionInternal(defaultActionDef);
    expect(action.id).toBe('test-action');
  });

  describe('displays toasts when execute function throws', () => {
    const addWarningMock = vi.fn();
    beforeAll(() => {
      vi.mocked(getNotifications).mockReturnValue({
        toasts: {
          addWarning: addWarningMock,
        },
      } as unknown as NotificationsStart);
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
      expect(addWarningMock).toHaveBeenCalledTimes(1);
    });

    test('execute function is async', async () => {
      const action = new ActionInternal({
        id: 'test-action',
        execute: async () => {
          throw new Error('');
        },
      });
      await action.execute({});
      expect(addWarningMock).toHaveBeenCalledTimes(1);
    });
  });
});
