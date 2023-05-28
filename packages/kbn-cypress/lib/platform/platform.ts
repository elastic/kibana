/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import getos from 'getos';
import { cpus, freemem, platform, release, totalmem } from 'os';
import { promisify } from 'util';
const debug = Debug('currents:platform');

const getOsVersion = async () => {
  if (platform() === 'linux') {
    try {
      const linuxOs = await promisify(getos)();
      if ('dist' in linuxOs && 'release' in linuxOs) {
        return [linuxOs.dist, linuxOs.release].join(' - ');
      } else {
        return release();
      }
    } catch {
      return release();
    }
  }
  return release();
};

export const getPlatformInfo = async () => {
  const osVersion = await getOsVersion();
  const result = {
    osName: platform(),
    osVersion,
    osCpus: cpus(),
    osMemory: {
      free: freemem(),
      total: totalmem(),
    },
  };
  debug('platform info: %o', result);
  return result;
};
