/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Wrap the real loaders so we can count reads without stubbing the registry.
jest.mock('./teams', () => {
  const actual = jest.requireActual('./teams');
  return {
    __esModule: true,
    ...actual,
    getTeams: jest.fn(actual.getTeams),
  };
});

import { getTeams } from './teams';
import { getCodeOwnerAreaMappings } from './code_owner_areas';

const mockGetTeams = getTeams as jest.MockedFunction<typeof getTeams>;

describe('getCodeOwnerAreaMappings laziness', () => {
  it('does not read the registry at import time, then computes once and memoizes', () => {
    // Importing the module (above) must not have touched the registry.
    expect(mockGetTeams).not.toHaveBeenCalled();

    const first = getCodeOwnerAreaMappings();
    expect(mockGetTeams).toHaveBeenCalledTimes(1);

    const second = getCodeOwnerAreaMappings();
    expect(mockGetTeams).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });
});
