/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';

import { Keystore } from '.';
import { getKeystore } from './get_keystore';

export async function readKeystore(keystorePath = getKeystore()) {
  const keystore = await Keystore.initialize(keystorePath);
  const keys = Object.keys(keystore.data);
  const data = {};

  keys.forEach((key) => {
    set(data, key, keystore.data[key]);
  });

  return data;
}
