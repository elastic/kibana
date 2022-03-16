/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createUrlTracker, IUrlTracker } from './url_tracker';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import { createMemoryHistory, History } from 'history';

describe('urlTracker', () => {
  let storage: StubBrowserStorage;
  let history: History;
  let urlTracker: IUrlTracker;
  beforeEach(() => {
    storage = new StubBrowserStorage();
    history = createMemoryHistory();
    urlTracker = createUrlTracker('test', storage);
  });

  it('should return null if no tracked url', () => {
    expect(urlTracker.getTrackedUrl()).toBeNull();
  });

  it('should return last tracked url', () => {
    urlTracker.trackUrl('http://localhost:4200');
    urlTracker.trackUrl('http://localhost:4201');
    urlTracker.trackUrl('http://localhost:4202');
    expect(urlTracker.getTrackedUrl()).toBe('http://localhost:4202');
  });

  it('should listen to history and track updates', () => {
    const stop = urlTracker.startTrackingUrl(history);
    expect(urlTracker.getTrackedUrl()).toBe('/');
    history.push('/1');
    history.replace('/2');
    expect(urlTracker.getTrackedUrl()).toBe('/2');

    stop();
    history.replace('/3');
    expect(urlTracker.getTrackedUrl()).toBe('/2');
  });
});
