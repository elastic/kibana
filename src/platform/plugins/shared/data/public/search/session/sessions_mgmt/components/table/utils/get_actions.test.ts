/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionStatus } from '../../../../../../../common';
import { getActions } from './get_actions';

describe('getActions', () => {
  describe.each([
    {
      status: SearchSessionStatus.COMPLETE,
      expectedActions: ['inspect', 'rename', 'extend', 'delete'],
    },
    {
      status: SearchSessionStatus.IN_PROGRESS,
      expectedActions: ['inspect', 'rename', 'extend', 'delete'],
    },
    {
      status: SearchSessionStatus.ERROR,
      expectedActions: ['inspect', 'rename', 'delete'],
    },
    {
      status: SearchSessionStatus.EXPIRED,
      expectedActions: ['inspect', 'rename', 'delete'],
    },
    {
      status: SearchSessionStatus.CANCELLED,
      expectedActions: ['inspect', 'rename', 'delete'],
    },
  ])('when the status is $status', ({ status, expectedActions }) => {
    it('should return the correct actions', () => {
      const actions = getActions(status);
      expect(actions).toEqual(expectedActions);
    });
  });
});
