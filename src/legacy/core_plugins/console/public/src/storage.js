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

const { transform, keys, startsWith } = require('lodash');

class Storage {
  constructor(engine, prefix) {
    this.engine = engine;
    this.prefix = prefix;
  }

  encode(val) {
    return JSON.stringify(val);
  }

  decode(val) {
    if (typeof val === 'string') {
      return JSON.parse(val);
    }
  }

  encodeKey(key) {
    return `${this.prefix}${key}`;
  }

  decodeKey(key) {
    if (startsWith(key, this.prefix)) {
      return `${key.slice(this.prefix.length)}`;
    }
  }

  set(key, val) {
    this.engine.setItem(this.encodeKey(key), this.encode(val));
    return val;
  }

  has(key) {
    return this.engine.getItem(this.encodeKey(key)) != null;
  }

  get(key, _default) {
    if (this.has(key)) {
      return this.decode(this.engine.getItem(this.encodeKey(key)));
    } else {
      return _default;
    }
  }

  delete(key) {
    return this.engine.removeItem(this.encodeKey(key));
  }

  keys() {
    return transform(keys(this.engine), (ours, key) => {
      const ourKey = this.decodeKey(key);
      if (ourKey != null) ours.push(ourKey);
    });
  }
}

const instance = new Storage(window.localStorage, 'sense:');

export default instance;
