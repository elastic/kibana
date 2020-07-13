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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { installBrowser } from '../../../../x-pack/plugins/reporting/server/browsers/install';
import { first } from 'rxjs/operators';

export const InstallChromiumTask = {
  description: 'Installing Chromium',

  async run(config, log, build) {
    if (build.isOss()) {
      return;
    } else {
      for (const platform of config.getNodePlatforms()) {
        log.info(`Installing Chromium for ${platform.getName()}-${platform.getArchitecture()}`);

        const { binaryPath$ } = installBrowser(
          log,
          build.resolvePathForPlatform(platform, 'x-pack/plugins/reporting/chromium'),
          platform.getName(),
          platform.getArchitecture()
        );
        await binaryPath$.pipe(first()).toPromise();
      }
    }
  },
};
