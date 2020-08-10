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

import { Platform } from './platform';

describe('getName()', () => {
  it('returns the name argument', () => {
    expect(new Platform('win32', 'x64', 'foo').getName()).toBe('win32');
  });
});

describe('getNodeArch()', () => {
  it('returns the node arch for the passed name', () => {
    expect(new Platform('win32', 'x64', 'foo').getNodeArch()).toBe('win32-x64');
  });
});

describe('getBuildName()', () => {
  it('returns the build name for the passed name', () => {
    expect(new Platform('linux', 'arm64', 'linux-aarch64').getBuildName()).toBe('linux-aarch64');
  });
});

describe('isWindows()', () => {
  it('returns true if name is win32', () => {
    expect(new Platform('win32', 'x64', 'foo').isWindows()).toBe(true);
    expect(new Platform('linux', 'x64', 'foo').isWindows()).toBe(false);
    expect(new Platform('darwin', 'x64', 'foo').isWindows()).toBe(false);
  });
});

describe('isLinux()', () => {
  it('returns true if name is linux', () => {
    expect(new Platform('win32', 'x64', 'foo').isLinux()).toBe(false);
    expect(new Platform('linux', 'x64', 'foo').isLinux()).toBe(true);
    expect(new Platform('darwin', 'x64', 'foo').isLinux()).toBe(false);
  });
});

describe('isMac()', () => {
  it('returns true if name is darwin', () => {
    expect(new Platform('win32', 'x64', 'foo').isMac()).toBe(false);
    expect(new Platform('linux', 'x64', 'foo').isMac()).toBe(false);
    expect(new Platform('darwin', 'x64', 'foo').isMac()).toBe(true);
  });
});
