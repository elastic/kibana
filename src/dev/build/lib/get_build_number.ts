/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import os from 'os';
import execa from 'execa';

export async function getBuildNumber() {
  if (/^win/.test(os.platform())) {
    // Windows does not have the wc process and `find /C /V ""` does not consistently work
    const log = await execa('git', ['log', '--format="%h"']);
    return log.stdout.split('\n').length;
  }

  const wc = await execa.command('git log --format="%h" | wc -l', {
    shell: true,
  });
  return parseFloat(wc.stdout.trim());
}
