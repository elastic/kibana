/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IpFormat } from './ip';

describe('IP Address Format', () => {
  let ip: IpFormat;

  beforeEach(() => {
    ip = new IpFormat({}, jest.fn());
  });

  test('converts a value from a decimal to a string', () => {
    expect(ip.convert(1186489492)).toBe('70.184.100.148');
  });

  test('converts null and undefined to -', () => {
    expect(ip.convert(null)).toBe('-');
    expect(ip.convert(undefined)).toBe('-');
  });
});
