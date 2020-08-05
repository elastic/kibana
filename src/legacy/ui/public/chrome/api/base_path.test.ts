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
import './base_path.test.mocks';
import { initChromeBasePathApi } from './base_path';

function initChrome() {
  const chrome: any = {};
  initChromeBasePathApi(chrome);
  return chrome;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('#getBasePath()', () => {
  it('proxies to newPlatformHttp.basePath.get()', () => {
    const chrome = initChrome();
    expect(chrome.getBasePath()).toBe('npBasePath');
  });
});

describe('#addBasePath()', () => {
  it('proxies to newPlatformHttp.basePath.prepend(path)', () => {
    const chrome = initChrome();
    expect(chrome.addBasePath('/foo/bar')).toBe('npBasePath/foo/bar');
  });
});

describe('#removeBasePath', () => {
  it('proxies to newPlatformBasePath.basePath.remove(path)', () => {
    const chrome = initChrome();
    expect(chrome.removeBasePath('npBasePath/foo/bar')).toBe('/foo/bar');
  });
});
