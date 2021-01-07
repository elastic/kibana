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

import expect from '@kbn/expect';
import { Ipv4Address } from './ipv4_address';

describe('Ipv4Address', () => {
  it('should throw errors with invalid IP addresses', () => {
    // @ts-ignore
    expect(() => new Ipv4Address()).to.throwError();

    expect(() => new Ipv4Address('')).to.throwError();

    expect(() => new Ipv4Address('hello, world')).to.throwError();

    expect(() => new Ipv4Address('0.0.0')).to.throwError();

    expect(() => new Ipv4Address('256.0.0.0')).to.throwError();

    expect(() => new Ipv4Address('-1.0.0.0')).to.throwError();

    expect(() => new Ipv4Address(Number.MAX_SAFE_INTEGER)).to.throwError();
  });

  it('should allow creation with an integer or string', () => {
    expect(new Ipv4Address(2116932386).toString()).to.be(
      new Ipv4Address('126.45.211.34').toString()
    );
  });

  it('should correctly calculate the decimal representation of an IP address', () => {
    let ipAddress = new Ipv4Address('0.0.0.0');
    expect(ipAddress.valueOf()).to.be(0);

    ipAddress = new Ipv4Address('0.0.0.1');
    expect(ipAddress.valueOf()).to.be(1);

    ipAddress = new Ipv4Address('126.45.211.34');
    expect(ipAddress.valueOf()).to.be(2116932386);
  });

  it('toString()', () => {
    let ipAddress = new Ipv4Address('0.000.00000.1');
    expect(ipAddress.toString()).to.be('0.0.0.1');

    ipAddress = new Ipv4Address('123.123.123.123');
    expect(ipAddress.toString()).to.be('123.123.123.123');
  });
});
