/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getInstalledPackages } from '../../npm';
import { LICENSE_OVERRIDES } from '../../license_checker';

import { write, Task } from '../lib';
import { getNodeDownloadInfo } from './nodejs';
import { generateNoticeFromSource, generateBuildNoticeText } from '../../notice';

export const CreateNoticeFile: Task = {
  description: 'Generating NOTICE.txt file',

  async run(config, log, build) {
    log.info('Generating notice from source');
    log.indent(4);
    const noticeFromSource = await generateNoticeFromSource({
      productName: 'Kibana',
      directory: build.resolvePath(),
      log,
    });
    log.indent(-4);

    log.info('Discovering installed packages');
    const packages = await getInstalledPackages({
      directory: build.resolvePath(),
      includeDev: false,
      licenseOverrides: LICENSE_OVERRIDES,
    });

    log.info('Generating build notice');
    const { extractDir: nodeDir, version: nodeVersion } = getNodeDownloadInfo(
      config,
      config.getPlatform('linux', 'x64')
    );

    const notice = await generateBuildNoticeText({
      noticeFromSource,
      packages,
      nodeDir,
      nodeVersion,
    });

    log.info('Writing notice to NOTICE.txt');
    await write(build.resolvePath('NOTICE.txt'), notice);
  },
};
