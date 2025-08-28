/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionStatus } from '../../../../../../../common';
import { ACTION } from '../../../types';
import { getActions } from './get_actions';

describe('getActions', () => {
  describe.each([
    {
      status: SearchSessionStatus.COMPLETE,
      expectedActions: [ACTION.INSPECT, ACTION.RENAME, ACTION.EXTEND, ACTION.DELETE],
    },
    {
      status: SearchSessionStatus.IN_PROGRESS,
      expectedActions: [ACTION.INSPECT, ACTION.RENAME, ACTION.EXTEND, ACTION.DELETE],
    },
    {
      status: SearchSessionStatus.ERROR,
      expectedActions: [ACTION.INSPECT, ACTION.RENAME, ACTION.DELETE],
    },
    {
      status: SearchSessionStatus.EXPIRED,
      expectedActions: [ACTION.INSPECT, ACTION.RENAME, ACTION.DELETE],
    },
    {
      status: SearchSessionStatus.CANCELLED,
      expectedActions: [ACTION.INSPECT, ACTION.RENAME, ACTION.DELETE],
    },
  ])('when the status is $status', ({ status, expectedActions }) => {
    it('should return the correct actions', () => {
      const actions = getActions(status);
      expect(actions).toEqual(expectedActions);
    });
  });
});
