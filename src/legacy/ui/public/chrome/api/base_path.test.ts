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

import { newPlatformHttp } from './base_path.test.mocks';
import { initChromeBasePathApi } from './base_path';

function initChrome() {
  const chrome: any = {};
  initChromeBasePathApi(chrome);
  return chrome;
}

newPlatformHttp.getBasePath.mockImplementation(() => 'gotBasePath');
newPlatformHttp.prependBasePath.mockImplementation(() => 'addedToPath');
newPlatformHttp.removeBasePath.mockImplementation(() => 'removedFromPath');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('#getBasePath()', () => {
  it('proxies to newPlatformHttp.getBasePath()', () => {
    const chrome = initChrome();
    expect(newPlatformHttp.prependBasePath).not.toHaveBeenCalled();
    expect(chrome.getBasePath()).toBe('gotBasePath');
    expect(newPlatformHttp.getBasePath).toHaveBeenCalledTimes(1);
    expect(newPlatformHttp.getBasePath).toHaveBeenCalledWith();
  });
});

describe('#addBasePath()', () => {
  it('proxies to newPlatformHttp.prependBasePath(path)', () => {
    const chrome = initChrome();
    expect(newPlatformHttp.prependBasePath).not.toHaveBeenCalled();
    expect(chrome.addBasePath('foo/bar')).toBe('addedToPath');
    expect(newPlatformHttp.prependBasePath).toHaveBeenCalledTimes(1);
    expect(newPlatformHttp.prependBasePath).toHaveBeenCalledWith('foo/bar');
  });
});

describe('#removeBasePath', () => {
  it('proxies to newPlatformBasePath.removeBasePath(path)', () => {
    const chrome = initChrome();
    expect(newPlatformHttp.removeBasePath).not.toHaveBeenCalled();
    expect(chrome.removeBasePath('foo/bar')).toBe('removedFromPath');
    expect(newPlatformHttp.removeBasePath).toHaveBeenCalledTimes(1);
    expect(newPlatformHttp.removeBasePath).toHaveBeenCalledWith('foo/bar');
  });
});
