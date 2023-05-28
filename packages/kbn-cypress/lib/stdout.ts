/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cp from 'child_process';
const orginal = cp.spawn;

// @ts-ignore
cp.spawn = function (command, args, options) {
  // @ts-ignore
  if (command.match(/Cypress/)) {
    // @ts-ignore
    const process = orginal(command, args, {
      ...options,
      // using pipe enables capturing stdout and stderr
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return process;
  }

  // @ts-ignore
  return orginal(command, args, options);
};
