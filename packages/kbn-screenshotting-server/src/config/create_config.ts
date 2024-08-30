/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@kbn/safer-lodash-set';
import { cloneDeep, upperFirst } from 'lodash';
import type { Logger } from '@kbn/core/server';
import { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';
import { ConfigType } from './schema';

/*
 * Set up dynamic config defaults
 * - xpack.capture.browser.chromium.disableSandbox
 */
export async function createConfig(parentLogger: Logger, config: ConfigType) {
  const logger = parentLogger.get('config');

  if (config.browser.chromium.disableSandbox != null) {
    // disableSandbox was set by user
    return config;
  }

  // disableSandbox was not set by user, apply default for OS
  const { os, disableSandbox } = await getDefaultChromiumSandboxDisabled();
  const osName = [os.os, os.dist, os.release].filter(Boolean).map(upperFirst).join(' ').trim();

  logger.debug(`Running on OS: '${osName}'`);

  if (disableSandbox === true) {
    logger.warn(
      `Chromium sandbox provides an additional layer of protection, but is not supported for ${osName} OS. Automatically setting 'xpack.screenshotting.browser.chromium.disableSandbox: true'.`
    );
  } else {
    logger.info(
      `Chromium sandbox provides an additional layer of protection, and is supported for ${osName} OS. Automatically enabling Chromium sandbox.`
    );
  }

  return set(cloneDeep(config), 'browser.chromium.disableSandbox', disableSandbox);
}
