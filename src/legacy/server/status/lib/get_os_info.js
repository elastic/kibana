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

import os from 'os';
import getos from 'getos';
import { promisify } from 'util';

/**
 * Returns an object of OS information/
 */
export async function getOSInfo() {
  const osInfo = {
    platform: os.platform(),
    // Include the platform name in the release to avoid grouping unrelated platforms together.
    // release 1.0 across windows, linux, and darwin don't mean anything useful.
    platformRelease: `${os.platform()}-${os.release()}`
  };

  // Get distribution information for linux
  if (os.platform() === 'linux') {
    try {
      const distro = await promisify(getos)();
      osInfo.distro = distro.dist;
      // Include distro name in release for same reason as above.
      osInfo.distroRelease = `${distro.dist}-${distro.release}`;
    } catch (e) {
      // ignore errors
    }
  }

  return osInfo;
}
