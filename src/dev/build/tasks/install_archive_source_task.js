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

import { scanCopy } from '../lib';

export const InstallArchiveSourceTask = {
  description: 'Installing platform-specific archive source',
  async run(config, _, build) {
    const platform = config.getPlatformForThisOs();

    // copy all files from archive source for this platform into install directory
    await scanCopy({
      source: build.resolvePathForPlatform(platform),
      destination: config.resolveFromInstallDir(),
    });
  }
};
