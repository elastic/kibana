/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { set } from '@elastic/safer-lodash-set';

import { Keystore } from '.';
import { getKeystore } from '../../cli_keystore/get_keystore';

export function readKeystore(keystorePath = getKeystore()) {
  const keystore = new Keystore(keystorePath);
  keystore.load();

  const keys = Object.keys(keystore.data);
  const data = {};

  keys.forEach((key) => {
    set(data, key, keystore.data[key]);
  });

  return data;
}
