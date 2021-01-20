/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
