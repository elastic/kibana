/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const COMMANDS = [
  (await import('./bootstrap/bootstrap_command.mjs')).command,
  (await import('./watch_command.mjs')).command,
  (await import('./run_in_packages_command.mjs')).command,
  (await import('./clean_command.mjs')).command,
  (await import('./reset_command.mjs')).command,
  (await import('./x_command.mjs')).command,
];

/**
 * @param {string | undefined} name
 */
export function getCmd(name) {
  return COMMANDS.find((c) => (c.name.startsWith('_') ? c.name.slice(1) : c.name) === name);
}
