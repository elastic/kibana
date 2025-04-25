/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import os from 'os';
import { ChromiumArchivePaths } from './paths';

const paths = new ChromiumArchivePaths();

export const getChromiumPackage = () => {
  const platform = process.platform;
  const architecture = os.arch();

  const chromiumPackageInfo = paths.find(process.platform, architecture);
  if (!chromiumPackageInfo) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }
  return chromiumPackageInfo;
};
