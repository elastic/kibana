/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { App, AppDeepLink, AppUpdater } from '@kbn/core/public';
import { BehaviorSubject, combineLatest, map, take } from 'rxjs';
import { createRegisterCustomizationProfile, createProfileRegistry } from './profile_registry';

describe('createProfileRegistry', () => {
  it('should allow registering profiles', () => {
    const registry = createProfileRegistry();
    registry.set({
      id: 'test',
      customizationCallbacks: [],
    });
    registry.set({
      id: 'test2',
      customizationCallbacks: [],
    });
    expect(registry.get('test')).toEqual({
      id: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('test2')).toEqual({
      id: 'test2',
      customizationCallbacks: [],
    });
  });

  it('should allow overriding profiles', () => {
    const registry = createProfileRegistry();
    registry.set({
      id: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('test')).toEqual({
      id: 'test',
      customizationCallbacks: [],
    });
    const callback = jest.fn();
    registry.set({
      id: 'test',
      customizationCallbacks: [callback],
    });
    expect(registry.get('test')).toEqual({
      id: 'test',
      customizationCallbacks: [callback],
    });
  });

  it('should be case insensitive', () => {
    const registry = createProfileRegistry();
    registry.set({
      id: 'test',
      customizationCallbacks: [],
    });
    expect(registry.get('tEsT')).toEqual({
      id: 'test',
      customizationCallbacks: [],
    });
  });
});

describe('createRegisterCustomizationProfile', () => {
  test('should add a customization callback to the registry', () => {
    const registry = createProfileRegistry();
    const registerCustomizationProfile = createRegisterCustomizationProfile(registry);
    const callback = jest.fn();
    registerCustomizationProfile('test', { customize: callback });
    expect(registry.get('test')).toEqual({
      id: 'test',
      customizationCallbacks: [callback],
      deepLinks: [],
    });
    const callback2 = jest.fn();
    registerCustomizationProfile('test', { customize: callback2 });
    expect(registry.get('test')).toEqual({
      id: 'test',
      customizationCallbacks: [callback, callback2],
      deepLinks: [],
    });
  });
});

describe('profile.getContributedAppState$ observable', () => {
  test('should notify subscribers with new app updates when a profile is registered', (done) => {
    const registry = createProfileRegistry();
    const callback = jest.fn();
    const appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

    const mockDeepLink: AppDeepLink = {
      id: 'test-deepLink',
      title: 'Test deep link',
      path: '/test-deep-link',
    };
    let mockApp: App = { id: 'test-app', title: 'Test App', mount: () => () => {} };
    const expectedApp: App = { ...mockApp, deepLinks: [mockDeepLink] };

    const appStateUpdater$ = combineLatest([appUpdater$, registry.getContributedAppState$()]).pipe(
      map(
        ([appUpdater, registryContributor]): AppUpdater =>
          (app) => ({ ...appUpdater(app), ...registryContributor(app) })
      ),
      take(3)
    );

    appStateUpdater$.subscribe({
      next: (updater) => {
        mockApp = { ...mockApp, ...updater(mockApp) };
      },
      complete: () => {
        expect(mockApp).toEqual(expectedApp);
        done();
      },
    });

    // First update, no deepLinks set
    registry.set({
      id: 'test',
      customizationCallbacks: [callback],
    });

    // Second update, deepLinks set to update app
    registry.set({
      id: 'test',
      customizationCallbacks: [],
      deepLinks: [mockDeepLink],
    });
  });
});
