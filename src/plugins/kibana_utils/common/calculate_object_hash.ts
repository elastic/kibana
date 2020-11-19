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

// adopted form https://github.com/bevacqua/hash-sum

function pad(hash: string, len: number): string {
  while (hash.length < len) {
    hash = '0' + hash;
  }
  return hash;
}

function fold(hash: number, text: string): number {
  let i;
  let chr;
  let len;
  if (text.length === 0) {
    return hash;
  }
  for (i = 0, len = text.length; i < len; i++) {
    chr = text.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = (hash << 5) - hash + chr;
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  return hash < 0 ? hash * -2 : hash;
}

function foldObject(hash: number, o: any, seen: any[]) {
  function foldKey(h: number, key: string): number {
    return foldValue(h, o[key], key, seen);
  }

  return Object.keys(o).sort().reduce(foldKey, hash);
}

function foldValue(input: number, value: any, key: string, seen: any[]) {
  const hash = fold(fold(fold(input, key), toString(value)), typeof value);
  if (value === null) {
    return fold(hash, 'null');
  }
  if (value === undefined) {
    return fold(hash, 'undefined');
  }
  if (typeof value === 'object') {
    // skip vis object from hash calculation
    if (key === 'vis' && value.constructor.name === 'Vis') {
      return hash;
    }
    if (seen.indexOf(value) !== -1) {
      return fold(hash, '[Circular]' + key);
    }
    seen.push(value);
    return foldObject(hash, value, seen);
  }
  return fold(hash, value.toString());
}

function toString(o: object): string {
  return Object.prototype.toString.call(o);
}

function sum(o: object): string {
  return pad(foldValue(0, o, '', []).toString(16), 8);
}

export const calculateObjectHash = sum;
