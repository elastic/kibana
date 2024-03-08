/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { App, AppDeepLink, AppUpdater } from '@kbn/core/public';
import { BehaviorSubject, combineLatest, map, take } from 'rxjs';
import { createProfile, createProfileRegistry } from './profile_registry';

describe('createProfileRegistry', () => {
  it('should allow registering profiles', () => {
    const registry = createProfileRegistry();
    registry.set(createProfile({ id: 'test', displayName: 'test' }));
    registry.set(createProfile({ id: 'test2', displayName: 'test2' }));
    expect(registry.get('test')).toEqual(createProfile({ id: 'test', displayName: 'test' }));
    expect(registry.get('test2')).toEqual(createProfile({ id: 'test2', displayName: 'test2' }));
  });

  it('should allow overriding profiles', () => {
    const registry = createProfileRegistry();
    registry.set(createProfile({ id: 'test', displayName: 'test' }));
    expect(registry.get('test')).toEqual(createProfile({ id: 'test', displayName: 'test' }));
    const callback = jest.fn();
    registry.set(
      createProfile({ id: 'test', displayName: 'test', customizationCallbacks: [callback] })
    );
    expect(registry.get('test')).toEqual(
      createProfile({ id: 'test', displayName: 'test', customizationCallbacks: [callback] })
    );
  });

  it('should be case insensitive', () => {
    const registry = createProfileRegistry();
    registry.set(createProfile({ id: 'test', displayName: 'test' }));
    expect(registry.get('tEsT')).toEqual(createProfile({ id: 'test', displayName: 'test' }));
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
    registry.set(
      createProfile({ id: 'test', displayName: 'test', customizationCallbacks: [callback] })
    );

    // Second update, deepLinks set to update app
    registry.set(createProfile({ id: 'test', displayName: 'test', deepLinks: [mockDeepLink] }));
  });
});
