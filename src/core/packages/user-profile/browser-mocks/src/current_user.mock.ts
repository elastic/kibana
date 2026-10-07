/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CurrentUser, UseCurrentUserResult } from '@kbn/core-user-profile-browser-hooks';

const createCurrentUser = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  username: 'jdoe',
  email: 'jdoe@elastic.co',
  fullName: 'John Doe',
  displayName: 'John Doe',
  isAnonymous: false,
  profileUid: 'uid',
  ...overrides,
});

const createResult = (overrides: Partial<UseCurrentUserResult> = {}): UseCurrentUserResult => ({
  user: createCurrentUser(),
  isLoading: false,
  errors: {},
  ...overrides,
});

export const currentUserMock = {
  createCurrentUser,
  createResult,
};
