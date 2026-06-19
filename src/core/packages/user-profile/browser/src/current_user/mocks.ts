/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CurrentUser } from './types';
import type { UseCurrentUserResult, UseCurrentUserResultWithRaw } from './use_current_user';

const createCurrentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  username: 'jdoe',
  email: 'jdoe@elastic.co',
  fullName: 'John Doe',
  displayName: 'John Doe',
  roles: ['superuser'],
  isCloudUser: false,
  isOperator: false,
  isAnonymous: false,
  profileUid: 'uid',
  ...overrides,
});

const createResult = (overrides: Partial<UseCurrentUserResult> = {}): UseCurrentUserResult => ({
  user: createCurrentUser(),
  isLoading: false,
  ...overrides,
});

const createResultWithRaw = (
  overrides: Partial<UseCurrentUserResultWithRaw> = {}
): UseCurrentUserResultWithRaw => ({
  user: createCurrentUser(),
  isLoading: false,
  rawAuthQuery: { isLoading: false, data: undefined, error: undefined },
  rawProfileQuery: { isLoading: false, data: null, error: undefined },
  ...overrides,
});

export const currentUserMock = {
  createCurrentUser,
  createResult,
  createResultWithRaw,
};
