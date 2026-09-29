/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { createContextAwarenessMocks } from '../__mocks__';
import { extendProfileProvider } from './extend_profile_provider';

const { dataSourceProfileProviderMock } = createContextAwarenessMocks();

describe('extendProfileProvider', () => {
  it('should merge profiles and overwrite other properties', () => {
    const resolve = vi.fn();
    const getDefaultAppState = vi.fn();
    const extendedProfileProvider = extendProfileProvider(dataSourceProfileProviderMock, {
      profileId: 'extended-profile',
      profile: { getDefaultAppState },
      resolve,
    });

    expect(extendedProfileProvider).toEqual({
      ...dataSourceProfileProviderMock,
      profileId: 'extended-profile',
      profile: {
        ...dataSourceProfileProviderMock.profile,
        getDefaultAppState,
      },
      resolve,
    });
  });
});
