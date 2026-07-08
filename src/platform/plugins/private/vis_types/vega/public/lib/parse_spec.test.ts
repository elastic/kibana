/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { parseVegaSpec } from './parse_spec';

jest.mock('hjson', () => ({
  parse: jest.fn((spec: string, opts: unknown) => JSON.parse(spec)),
}));

describe('parseVegaSpec', () => {
  beforeEach(() => {
    (parse as jest.Mock).mockClear();
  });

  it('parses a valid spec', () => {
    const spec = parseVegaSpec('{"data": {"name": "metric"}}');
    expect(spec).toEqual({ data: { name: 'metric' } });
  });

  it('memoizes the result for the same spec string', () => {
    const specString = '{"data": {"name": "cached"}}';

    const first = parseVegaSpec(specString);
    const second = parseVegaSpec(specString);

    expect(first).toBe(second);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('re-parses when the spec string changes', () => {
    parseVegaSpec('{"data": {"name": "one"}}');
    parseVegaSpec('{"data": {"name": "two"}}');

    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('returns null and does not throw for an invalid spec', () => {
    expect(parseVegaSpec('{not valid json')).toBeNull();
  });

  it('memoizes invalid specs too, without re-parsing', () => {
    const invalidSpec = '{also not valid json';

    parseVegaSpec(invalidSpec);
    parseVegaSpec(invalidSpec);

    expect(parse).toHaveBeenCalledTimes(1);
  });
});
