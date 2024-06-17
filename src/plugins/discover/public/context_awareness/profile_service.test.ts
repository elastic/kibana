/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { AsyncProfileService, ContextWithProfileId, ProfileService } from './profile_service';
import { Profile } from './types';

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

class TestProfileService extends ProfileService<Profile, TestParams, TestContext> {
  constructor() {
    super(defaultContext);
  }
}

type TestProfileProvider = Parameters<TestProfileService['registerProvider']>[0];

class TestAsyncProfileService extends AsyncProfileService<Profile, TestParams, TestContext> {
  constructor() {
    super(defaultContext);
  }
}

type TestAsyncProfileProvider = Parameters<TestAsyncProfileService['registerProvider']>[0];

const provider: TestProfileProvider = {
  profileId: 'test-profile-1',
  profile: { getCellRenderers: jest.fn() },
  resolve: jest.fn(() => ({ isMatch: false })),
};

const provider2: TestProfileProvider = {
  profileId: 'test-profile-2',
  profile: { getCellRenderers: jest.fn() },
  resolve: jest.fn(({ myParam }) => ({ isMatch: true, context: { myContext: myParam } })),
};

const provider3: TestProfileProvider = {
  profileId: 'test-profile-3',
  profile: { getCellRenderers: jest.fn() },
  resolve: jest.fn(({ myParam }) => ({ isMatch: true, context: { myContext: myParam } })),
};

const asyncProvider2: TestAsyncProfileProvider = {
  profileId: 'test-profile-2',
  profile: { getCellRenderers: jest.fn() },
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
    expect(service.getProfile({ profileId: 'test-profile-1', myContext: 'test' })).toBe(
      provider.profile
    );
    expect(service.getProfile({ profileId: 'test-profile-2', myContext: 'test' })).toBe(
      provider2.profile
    );
  });

  it('should return empty profile if no provider is found', () => {
    service.registerProvider(provider);
    expect(service.getProfile({ profileId: 'test-profile-2', myContext: 'test' })).toEqual({});
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
