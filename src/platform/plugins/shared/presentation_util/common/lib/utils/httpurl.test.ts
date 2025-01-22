/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidHttpUrl } from './httpurl';

describe('httpurl.isValidHttpUrl', () => {
  it('matches HTTP URLs', () => {
    expect(isValidHttpUrl('http://server.com/veggie/hamburger.jpg')).toBe(true);
    expect(isValidHttpUrl('https://server.com:4443/veggie/hamburger.jpg')).toBe(true);
    expect(isValidHttpUrl('http://user:password@server.com:4443/veggie/hamburger.jpg')).toBe(true);
    expect(isValidHttpUrl('http://virtual-machine/veggiehamburger.jpg')).toBe(true);
    expect(isValidHttpUrl('https://virtual-machine:44330/veggie.jpg?hamburger')).toBe(true);
    expect(isValidHttpUrl('http://192.168.1.50/veggie/hamburger.jpg')).toBe(true);
    expect(isValidHttpUrl('https://2600::/veggie/hamburger.jpg')).toBe(true); // ipv6
    expect(isValidHttpUrl('http://2001:4860:4860::8844/veggie/hamburger.jpg')).toBe(true); // ipv6
  });
  it('rejects non-HTTP URLs', () => {
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('http://server.com')).toBe(false);
    expect(isValidHttpUrl('file:///Users/programmer/Pictures/hamburger.jpeg')).toBe(false);
    expect(isValidHttpUrl('ftp://hostz.com:1111/path/to/image.png')).toBe(false);
    expect(isValidHttpUrl('ftp://user:password@host:1111/path/to/image.png')).toBe(false);
    expect(
      isValidHttpUrl('data:image/gif;base64,R0lGODlhPQBEAPeoAJosM//AwO/AwHVYZ/z595kzAP/s7P+...')
    ).toBe(false);
  });
});
