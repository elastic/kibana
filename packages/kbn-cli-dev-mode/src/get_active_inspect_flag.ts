/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';

const execOpts = getopts(process.execArgv);
const envOpts = getopts(
  process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.trim().split(/\s+/) : []
);

export function getActiveInspectFlag() {
  if (execOpts.inspect) {
    return '--inspect';
  }

  if (execOpts['inspect-brk']) {
    return '--inspect-brk';
  }

  if (envOpts.inspect) {
    return '--inspect';
  }

  if (envOpts['inspect-brk']) {
    return '--inspect-brk';
  }
}
