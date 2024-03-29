/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import { addProfile } from '../../common/customizations';
import { HistoryLocationState } from '../build_services';
import { ProfileAwareLocator } from './profile_aware_locator';

let mockHistory: History<HistoryLocationState>;

describe('ProfileAwareLocator', () => {
  beforeEach(() => {
    mockHistory = {
      location: {
        pathname: '',
      },
    } as History<HistoryLocationState>;
  });

  it('should inject profile', async () => {
    mockHistory.location.pathname = addProfile('', 'test');
    const locator = {
      id: 'test',
      migrations: {},
      getLocation: jest.fn(),
      getUrl: jest.fn(),
      getRedirectUrl: jest.fn(),
      navigate: jest.fn(),
      navigateSync: jest.fn(),
      useUrl: jest.fn(),
      telemetry: jest.fn(),
      inject: jest.fn(),
      extract: jest.fn(),
    };
    const profileAwareLocator = new ProfileAwareLocator(locator, mockHistory);
    const params = { foo: 'bar' };
    const injectedParams = { foo: 'bar', profile: 'test' };
    await profileAwareLocator.getLocation(params);
    expect(locator.getLocation).toHaveBeenCalledWith(injectedParams);
    await profileAwareLocator.getUrl(params, { absolute: true });
    expect(locator.getUrl).toHaveBeenCalledWith(injectedParams, { absolute: true });
    profileAwareLocator.getRedirectUrl(params, { lzCompress: true });
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(injectedParams, { lzCompress: true });
    await profileAwareLocator.navigate(params, { replace: true });
    expect(locator.navigate).toHaveBeenCalledWith(injectedParams, { replace: true });
    profileAwareLocator.navigateSync(params, { replace: true });
    expect(locator.navigateSync).toHaveBeenCalledWith(injectedParams, { replace: true });
    profileAwareLocator.useUrl(params, { absolute: true }, ['test']);
    expect(locator.useUrl).toHaveBeenCalledWith(injectedParams, { absolute: true }, ['test']);
    profileAwareLocator.telemetry(params, { foo: 'bar' });
    expect(locator.telemetry).toHaveBeenCalledWith(injectedParams, { foo: 'bar' });
    await profileAwareLocator.inject(params, [{ id: 'test', name: 'test', type: 'test' }]);
    expect(locator.inject).toHaveBeenCalledWith(injectedParams, [
      { id: 'test', name: 'test', type: 'test' },
    ]);
    profileAwareLocator.extract(params);
    expect(locator.extract).toHaveBeenCalledWith(injectedParams);
  });

  it('should not overwrite the provided profile with an injected one', async () => {
    mockHistory.location.pathname = addProfile('', 'test');
    const locator = {
      id: 'test',
      migrations: {},
      getLocation: jest.fn(),
      getUrl: jest.fn(),
      getRedirectUrl: jest.fn(),
      navigate: jest.fn(),
      navigateSync: jest.fn(),
      useUrl: jest.fn(),
      telemetry: jest.fn(),
      inject: jest.fn(),
      extract: jest.fn(),
    };
    const profileAwareLocator = new ProfileAwareLocator(locator, mockHistory);
    const params = { foo: 'bar', profile: 'test2' };
    await profileAwareLocator.getLocation(params);
    expect(locator.getLocation).toHaveBeenCalledWith(params);
    await profileAwareLocator.getUrl(params, { absolute: true });
    expect(locator.getUrl).toHaveBeenCalledWith(params, { absolute: true });
    profileAwareLocator.getRedirectUrl(params, { lzCompress: true });
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(params, { lzCompress: true });
    await profileAwareLocator.navigate(params, { replace: true });
    expect(locator.navigate).toHaveBeenCalledWith(params, { replace: true });
    profileAwareLocator.navigateSync(params, { replace: true });
    expect(locator.navigateSync).toHaveBeenCalledWith(params, { replace: true });
    profileAwareLocator.useUrl(params, { absolute: true }, ['test']);
    expect(locator.useUrl).toHaveBeenCalledWith(params, { absolute: true }, ['test']);
    profileAwareLocator.telemetry(params, { foo: 'bar' });
    expect(locator.telemetry).toHaveBeenCalledWith(params, { foo: 'bar' });
    await profileAwareLocator.inject(params, [{ id: 'test', name: 'test', type: 'test' }]);
    expect(locator.inject).toHaveBeenCalledWith(params, [
      { id: 'test', name: 'test', type: 'test' },
    ]);
    profileAwareLocator.extract(params);
    expect(locator.extract).toHaveBeenCalledWith(params);
  });

  it('should not pass a profile if there is no profile in the URL', async () => {
    const locator = {
      id: 'test',
      migrations: {},
      getLocation: jest.fn(),
      getUrl: jest.fn(),
      getRedirectUrl: jest.fn(),
      navigate: jest.fn(),
      navigateSync: jest.fn(),
      useUrl: jest.fn(),
      telemetry: jest.fn(),
      inject: jest.fn(),
      extract: jest.fn(),
    };
    const profileAwareLocator = new ProfileAwareLocator(locator, mockHistory);
    const params = { foo: 'bar' };
    await profileAwareLocator.getLocation(params);
    expect(locator.getLocation).toHaveBeenCalledWith(params);
    await profileAwareLocator.getUrl(params, { absolute: true });
    expect(locator.getUrl).toHaveBeenCalledWith(params, { absolute: true });
    profileAwareLocator.getRedirectUrl(params, { lzCompress: true });
    expect(locator.getRedirectUrl).toHaveBeenCalledWith(params, { lzCompress: true });
    await profileAwareLocator.navigate(params, { replace: true });
    expect(locator.navigate).toHaveBeenCalledWith(params, { replace: true });
    profileAwareLocator.navigateSync(params, { replace: true });
    expect(locator.navigateSync).toHaveBeenCalledWith(params, { replace: true });
    profileAwareLocator.useUrl(params, { absolute: true }, ['test']);
    expect(locator.useUrl).toHaveBeenCalledWith(params, { absolute: true }, ['test']);
    profileAwareLocator.telemetry(params, { foo: 'bar' });
    expect(locator.telemetry).toHaveBeenCalledWith(params, { foo: 'bar' });
    await profileAwareLocator.inject(params, [{ id: 'test', name: 'test', type: 'test' }]);
    expect(locator.inject).toHaveBeenCalledWith(params, [
      { id: 'test', name: 'test', type: 'test' },
    ]);
    profileAwareLocator.extract(params);
    expect(locator.extract).toHaveBeenCalledWith(params);
  });
});
