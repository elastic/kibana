/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MergedConfig } from '../config';
import { guessBrowser } from './browser';
import { getPlatformInfo } from './platform';

export async function getPlatform({ browser, config }: { browser?: string; config: MergedConfig }) {
  return {
    ...(await getPlatformInfo()),
    ...guessBrowser(browser ?? 'electron', config.resolved?.browsers),
  };
}
