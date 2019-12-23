/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createUrlTracker, IUrlTracker } from './url_tracker';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
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
