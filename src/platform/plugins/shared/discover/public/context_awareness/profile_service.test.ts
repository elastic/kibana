/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import {
  AsyncProfileProvider,
  AsyncProfileService,
  ContextWithProfileId,
  ProfileProvider,
  ProfileService,
} from './profile_service';
import type { CellRenderersExtensionParams, Profile } from './types';

interface TestParams {
  myParam: string;
}

interface TestContext {
  myContext: string;
}

const defaultContext: ContextWithProfileId<TestContext> = {
  profileId: 'test-profile',
  myContext: 'test',
};

class TestProfileService extends ProfileService<ProfileProvider<Profile, TestParams, TestContext>> {
  constructor() {
    super(defaultContext);
  }
}

type TestProfileProvider = Parameters<TestProfileService['registerProvider']>[0];

class TestAsyncProfileService extends AsyncProfileService<
  AsyncProfileProvider<Profile, TestParams, TestContext>
> {
  constructor() {
    super(defaultContext);
  }
}

type TestAsyncProfileProvider = Parameters<TestAsyncProfileService['registerProvider']>[0];

const provider: TestProfileProvider = {
  profileId: 'test-profile-1',
  profile: {
    getCellRenderers: jest.fn((prev) => (params) => prev(params)),
  },
  resolve: jest.fn(() => ({ isMatch: false })),
};

const provider2: TestProfileProvider = {
  profileId: 'test-profile-2',
  profile: { getCellRenderers: jest.fn((prev) => (params) => prev(params)) },
  resolve: jest.fn(({ myParam }) => ({ isMatch: true, context: { myContext: myParam } })),
};

const provider3: TestProfileProvider = {
  profileId: 'test-profile-3',
  profile: { getCellRenderers: jest.fn((prev) => (params) => prev(params)) },
  resolve: jest.fn(({ myParam }) => ({ isMatch: true, context: { myContext: myParam } })),
};

const asyncProvider2: TestAsyncProfileProvider = {
  profileId: 'test-profile-2',
  profile: { getCellRenderers: jest.fn((prev) => (params) => prev(params)) },
  resolve: jest.fn(async ({ myParam }) => ({ isMatch: true, context: { myContext: myParam } })),
};

describe('ProfileService', () => {
  let service: TestProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestProfileService();
  });

  it('should expose defaultContext', () => {
    expect(service.defaultContext).toBe(defaultContext);
  });

  it('should allow registering providers and getting profiles', () => {
    service.registerProvider(provider);
    service.registerProvider(provider2);
    const params = {
      context: { profileId: 'test-profile-1', myContext: 'test' },
    };
    const params2 = {
      context: { profileId: 'test-profile-2', myContext: 'test' },
    };
    const profile = service.getProfile(params);
    const profile2 = service.getProfile(params2);
    const baseImpl = jest.fn(() => ({}));
    profile.getCellRenderers?.(baseImpl)({} as unknown as CellRenderersExtensionParams);
    expect(provider.profile.getCellRenderers).toHaveBeenCalledTimes(1);
    expect(provider.profile.getCellRenderers).toHaveBeenCalledWith(baseImpl, params);
    expect(baseImpl).toHaveBeenCalledTimes(1);
    profile2.getCellRenderers?.(baseImpl)({} as unknown as CellRenderersExtensionParams);
    expect(provider2.profile.getCellRenderers).toHaveBeenCalledTimes(1);
    expect(provider2.profile.getCellRenderers).toHaveBeenCalledWith(baseImpl, params2);
    expect(baseImpl).toHaveBeenCalledTimes(2);
  });

  it('should return empty profile if no provider is found', () => {
    service.registerProvider(provider);
    expect(
      service.getProfile({ context: { profileId: 'test-profile-2', myContext: 'test' } })
    ).toEqual({});
  });

  it('should resolve to first matching context', () => {
    service.registerProvider(provider);
    service.registerProvider(provider2);
    service.registerProvider(provider3);
    expect(service.resolve({ myParam: 'test' })).toEqual({
      profileId: 'test-profile-2',
      myContext: 'test',
    });
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    expect(provider.resolve).toHaveBeenCalledWith({ myParam: 'test' });
    expect(provider2.resolve).toHaveBeenCalledTimes(1);
    expect(provider2.resolve).toHaveBeenCalledWith({ myParam: 'test' });
    expect(provider3.resolve).not.toHaveBeenCalled();
  });

  it('should resolve to default context if no matching context is found', () => {
    service.registerProvider(provider);
    expect(service.resolve({ myParam: 'test' })).toEqual(defaultContext);
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    expect(provider.resolve).toHaveBeenCalledWith({ myParam: 'test' });
  });
});

describe('AsyncProfileService', () => {
  let service: TestAsyncProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestAsyncProfileService();
  });

  it('should resolve to first matching context', async () => {
    service.registerProvider(provider);
    service.registerProvider(asyncProvider2);
    service.registerProvider(provider3);
    await expect(service.resolve({ myParam: 'test' })).resolves.toEqual({
      profileId: 'test-profile-2',
      myContext: 'test',
    });
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    expect(provider.resolve).toHaveBeenCalledWith({ myParam: 'test' });
    expect(asyncProvider2.resolve).toHaveBeenCalledTimes(1);
    expect(asyncProvider2.resolve).toHaveBeenCalledWith({ myParam: 'test' });
    expect(provider3.resolve).not.toHaveBeenCalled();
  });

  it('should resolve to default context if no matching context is found', async () => {
    service.registerProvider(provider);
    await expect(service.resolve({ myParam: 'test' })).resolves.toEqual(defaultContext);
    expect(provider.resolve).toHaveBeenCalledTimes(1);
    expect(provider.resolve).toHaveBeenCalledWith({ myParam: 'test' });
  });
});
