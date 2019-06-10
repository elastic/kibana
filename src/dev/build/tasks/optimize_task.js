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

import { deleteAll, copyAll, exec } from '../lib';
import { getNodeDownloadInfo } from './nodejs';

export const OptimizeBuildTask = {
  description: 'Running optimizer',

  async run(config, log, build) {
    const tempNodeInstallDir = build.resolvePath('node');
    const platform = config.getPlatformForThisOs();

    // copy extracted node for this platform into the build temporarily
    log.debug('Temporarily installing node.js for', platform.getNodeArch());
    const { extractDir } = getNodeDownloadInfo(config, platform);
    await copyAll(extractDir, tempNodeInstallDir);

    const kibanaScript = platform.isWindows()
      ? '.\\bin\\kibana.bat'
      : './bin/kibana';

    const kibanaArgs = [
      '--env.name=production',
      '--logging.json=false',
      '--optimize',
    ];

    log.info('Running bin/kibana to trigger the optimizer');

    await exec(log, kibanaScript, kibanaArgs, {
      cwd: build.resolvePath('.'),
      env: {
        FORCE_DLL_CREATION: 'true',
        KBN_CACHE_LOADER_WRITABLE: 'true',
        NODE_OPTIONS: '--max-old-space-size=2048'
      },
    });

    // clean up temporary node install
    await deleteAll([tempNodeInstallDir], log);
  },
};
