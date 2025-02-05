/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createBrowserHistory, type History } from 'history';
import { firstValueFrom } from 'rxjs';
import { getLocationObservable } from './get_location_observable';

const nextTick = () => new Promise((resolve) => window.setTimeout(resolve, 1));

describe('getLocationObservable', () => {
  let history: History;

  beforeEach(() => {
    history = createBrowserHistory();
  });

  it('emits with the initial location', async () => {
    const location$ = getLocationObservable({ pathname: '/foo', hash: '' }, history);
    expect(await firstValueFrom(location$)).toEqual('/foo');
  });

  it('emits when the location changes', async () => {
    const location$ = getLocationObservable({ pathname: '/foo', hash: '' }, history);
    const locations: string[] = [];
    location$.subscribe((location) => locations.push(location));

    history.push({ pathname: '/bar' });
    history.push({ pathname: '/dolly' });

    await nextTick();

    expect(locations).toEqual(['/foo', '/bar', '/dolly']);
  });

  it('emits only once for a given url', async () => {
    const location$ = getLocationObservable({ pathname: '/foo', hash: '' }, history);
    const locations: string[] = [];
    location$.subscribe((location) => locations.push(location));

    history.push({ pathname: '/bar' });
    history.push({ pathname: '/bar' });
    history.push({ pathname: '/foo' });

    await nextTick();

    expect(locations).toEqual(['/foo', '/bar', '/foo']);
  });

  it('includes the hash when present', async () => {
    const location$ = getLocationObservable({ pathname: '/foo', hash: '#/index' }, history);
    const locations: string[] = [];
    location$.subscribe((location) => locations.push(location));

    history.push({ pathname: '/bar', hash: '#/home' });

    await nextTick();

    expect(locations).toEqual(['/foo#/index', '/bar#/home']);
  });
});
