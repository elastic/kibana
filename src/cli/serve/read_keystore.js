/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { join } from 'path';
import { set } from 'lodash';

import { Keystore } from '../../server/keystore';
import { getData } from '../../server/path';

export function loadKeystore() {
  const path = join(getData(), 'kibana.keystore');

  const keystore = new Keystore(path);
  keystore.load();

  return keystore;
}

export function readKeystore() {
  const keystore = loadKeystore();
  const keys = Object.keys(keystore.data);

  const data = {};
  keys.forEach(key => {
    set(data, key, keystore.data[key]);
  });

  return data;
}
