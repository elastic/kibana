/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Keystore } from './lib';

export async function remove(keystore: Keystore, key: string) {
  await keystore.load();
  keystore.remove(key);
  keystore.save();
}

export function removeCli(program: any, keystore: Keystore) {
  program
    .command('remove <key>')
    .description('Remove a setting from the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(remove.bind(null, keystore));
}
