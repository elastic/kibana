/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as colors from './colors';
import { ms } from './ms';

export function writeEpilogue(log, stats, failuresDetail) {
  // header
  log.write('');

  // passes
  log.write(`${colors.pass('%d passing')} (%s)`, stats.passes || 0, ms(stats.duration));

  // pending
  if (stats.pending) {
    log.write(colors.pending('%d pending'), stats.pending);
  }

  // failures
  if (stats.failures) {
    log.write('%d failing', stats.failures);
    log.write('');
    failuresDetail.forEach(({ title, error }, i) => {
      log.write('%d) %s', i + 1, title);
      log.write('');
      log.write('%s', error);
    });
  }

  // footer
  log.write('');
}
