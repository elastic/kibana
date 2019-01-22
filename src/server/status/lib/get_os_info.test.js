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

jest.mock('os', () => ({
  platform: jest.fn(),
  release: jest.fn(),
}));
jest.mock('getos');

import os from 'os';
import getos from 'getos';

import { getOSInfo } from './get_os_info';

describe('getOSInfo', () => {
  it('returns basic OS info on non-linux', async () => {
    os.platform.mockImplementation(() => 'darwin');
    os.release.mockImplementation(() => '1.0.0');

    const osInfo = await getOSInfo();

    expect(osInfo).toEqual({
      platform: 'darwin',
      platformRelease: 'darwin-1.0.0',
    });
  });

  it('returns basic OS info and distro info on linux', async () => {
    os.platform.mockImplementation(() => 'linux');
    os.release.mockImplementation(() => '4.9.93-linuxkit-aufs');

    // Mock getos response
    getos.mockImplementation((cb) => cb(null, {
      os: 'linux',
      dist: 'Ubuntu Linux',
      codename: 'precise',
      release: '12.04'
    }));

    const osInfo = await getOSInfo();

    expect(osInfo).toEqual({
      platform: 'linux',
      platformRelease: 'linux-4.9.93-linuxkit-aufs',
      // linux distro info
      distro: 'Ubuntu Linux',
      distroRelease: 'Ubuntu Linux-12.04',
    });
  });
});
