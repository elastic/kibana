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
