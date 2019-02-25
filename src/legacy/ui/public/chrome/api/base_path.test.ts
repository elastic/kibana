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

import { __newPlatformInit__, initChromeBasePathApi } from './base_path';

function initChrome() {
  const chrome: any = {};
  initChromeBasePathApi(chrome);
  return chrome;
}

const newPlatformBasePath = {
  get: jest.fn().mockReturnValue('get'),
  addToPath: jest.fn().mockReturnValue('addToPath'),
  removeFromPath: jest.fn().mockReturnValue('removeFromPath'),
};
__newPlatformInit__(newPlatformBasePath);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('#getBasePath()', () => {
  it('proxies to newPlatformBasePath.get()', () => {
    const chrome = initChrome();
    expect(newPlatformBasePath.get).not.toHaveBeenCalled();
    expect(chrome.getBasePath()).toBe('get');
    expect(newPlatformBasePath.get).toHaveBeenCalledTimes(1);
    expect(newPlatformBasePath.get).toHaveBeenCalledWith();
  });
});

describe('#addBasePath()', () => {
  it('proxies to newPlatformBasePath.addToPath(path)', () => {
    const chrome = initChrome();
    expect(newPlatformBasePath.addToPath).not.toHaveBeenCalled();
    expect(chrome.addBasePath('foo/bar')).toBe('addToPath');
    expect(newPlatformBasePath.addToPath).toHaveBeenCalledTimes(1);
    expect(newPlatformBasePath.addToPath).toHaveBeenCalledWith('foo/bar');
  });
});

describe('#removeBasePath', () => {
  it('proxies to newPlatformBasePath.removeFromPath(path)', () => {
    const chrome = initChrome();
    expect(newPlatformBasePath.removeFromPath).not.toHaveBeenCalled();
    expect(chrome.removeBasePath('foo/bar')).toBe('removeFromPath');
    expect(newPlatformBasePath.removeFromPath).toHaveBeenCalledTimes(1);
    expect(newPlatformBasePath.removeFromPath).toHaveBeenCalledWith('foo/bar');
  });
});
