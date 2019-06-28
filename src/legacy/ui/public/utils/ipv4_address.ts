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

const NUM_BYTES = 4;
const BYTE_SIZE = 256;

function throwError(ipAddress: string | number) {
  throw Error('Invalid IPv4 address: ' + ipAddress);
}

function isIntegerInRange(integer: number, min: number, max: number) {
  return (
    !isNaN(integer as number) && integer >= min && integer < max && (integer as number) % 1 === 0
  );
}

// eslint-disable-next-line import/no-default-export
export default class Ipv4Address {
  private value: number;

  constructor(ipAddress: string | number) {
    if (typeof ipAddress === 'string') {
      this.value = 0;

      const bytes = ipAddress.split('.');
      if (bytes.length !== NUM_BYTES) {
        throwError(ipAddress);
      }

      for (let i = 0; i < bytes.length; i++) {
        const byte = Number(bytes[i]);
        if (!isIntegerInRange(byte, 0, BYTE_SIZE)) {
          throwError(ipAddress);
        }
        this.value += Math.pow(BYTE_SIZE, NUM_BYTES - 1 - i) * byte;
      }
    } else {
      this.value = ipAddress;
    }

    if (!isIntegerInRange(this.value, 0, Math.pow(BYTE_SIZE, NUM_BYTES))) {
      throwError(ipAddress);
    }
  }

  public toString() {
    let value = this.value;
    const bytes = [];
    for (let i = 0; i < NUM_BYTES; i++) {
      bytes.unshift(value % 256);
      value = Math.floor(value / 256);
    }
    return bytes.join('.');
  }

  public valueOf() {
    return this.value;
  }
}
