/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { magenta } from '../log';

import { info, spacer, warn } from '../log';
import { CloudWarning } from './types';

export function printWarnings(warnings: CloudWarning[]) {
  warn('Notice from cloud service:');
  warnings.map((w) => {
    spacer(1);
    info(magenta.bold(w.message));
    Object.entries(_.omit(w, 'message')).map(([key, value]) => {
      info('- %s: %s', key, value);
    });
    spacer(1);
  });
}
