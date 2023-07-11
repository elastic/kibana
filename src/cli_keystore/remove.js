/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function remove(keystore, key) {
  keystore.remove(key);
  keystore.save();
}

export function removeCli(program, keystore) {
  program
    .command('remove <key>')
    .description('Remove a setting from the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(remove.bind(null, keystore));
}
