/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AppStatus } from '@kbn/core-application-browser';
import type { Mounter } from '../types';
import { isAppNotFound, pathnameFromLocationUrl, resolveAppRoute } from './resolve_app_route';

const createMounter = (appRoute: string, exactRoute = false): Mounter => ({
  appRoute,
  appBasePath: appRoute,
  exactRoute,
  mount: jest.fn(),
});

describe('pathnameFromLocationUrl', () => {
  it('strips the hash', () => {
    expect(pathnameFromLocationUrl('/app/home#/dashboard')).toBe('/app/home');
  });

  it('returns the pathname when there is no hash', () => {
    expect(pathnameFromLocationUrl('/app/home')).toBe('/app/home');
  });
});

describe('resolveAppRoute', () => {
  it('matches a default /app/:appId mounter', () => {
    const mounters = new Map([['home', createMounter('/app/home')]]);
    expect(resolveAppRoute('/app/home', mounters)).toEqual({
      appId: 'home',
      appPath: '/app/home',
      mounter: mounters.get('home'),
    });
  });

  it('matches a custom appRoute before the catch-all', () => {
    const mounters = new Map([
      ['custom', createMounter('/custom-app')],
      ['other', createMounter('/app/other')],
    ]);
    expect(resolveAppRoute('/custom-app/path', mounters)).toEqual({
      appId: 'custom',
      appPath: '/custom-app',
      mounter: mounters.get('custom'),
    });
  });

  it('uses match.path for parameterized custom appRoutes', () => {
    const mounters = new Map([['param', createMounter('/custom/:section')]]);
    expect(resolveAppRoute('/custom/overview', mounters)).toEqual({
      appId: 'param',
      appPath: '/custom/:section',
      mounter: mounters.get('param'),
    });
  });

  it('respects exactRoute', () => {
    const mounters = new Map([['exact', createMounter('/exact-app', true)]]);
    expect(resolveAppRoute('/exact-app', mounters)?.appId).toBe('exact');
    expect(resolveAppRoute('/exact-app/nested', mounters)).toBeUndefined();
  });

  it('falls back to the /app/:appId catch-all for unknown apps', () => {
    const mounters = new Map([['home', createMounter('/app/home')]]);
    expect(resolveAppRoute('/app/unknown', mounters)).toEqual({
      appId: 'unknown',
      appPath: '/app/unknown',
    });
  });

  it('returns undefined outside application routing', () => {
    const mounters = new Map([['home', createMounter('/app/home')]]);
    expect(resolveAppRoute('/login', mounters)).toBeUndefined();
  });
});

describe('isAppNotFound', () => {
  const mounters = new Map([
    ['home', createMounter('/app/home')],
    ['disabled', createMounter('/app/disabled')],
  ]);
  const statuses = new Map([
    ['home', AppStatus.accessible],
    ['disabled', AppStatus.inaccessible],
  ]);

  it('is false for an accessible app', () => {
    expect(isAppNotFound('/app/home', mounters, statuses)).toBe(false);
  });

  it('is true for an inaccessible app', () => {
    expect(isAppNotFound('/app/disabled', mounters, statuses)).toBe(true);
  });

  it('is true for a missing app', () => {
    expect(isAppNotFound('/app/missing', mounters, statuses)).toBe(true);
  });

  it('is false outside application routing', () => {
    expect(isAppNotFound('/login', mounters, statuses)).toBe(false);
  });
});
