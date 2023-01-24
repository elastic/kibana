/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getArgValue,
  getKibanaCliArg,
  getKibanaCliLoggers,
  parseRawFlags,
} from './kibana_cli_args';

describe('parseRawFlags()', () => {
  it('produces a sorted list of flags', () => {
    expect(parseRawFlags(['--foo=bar', '--a=b', '--c.b.a=0', '--a.b.c=1'])).toMatchInlineSnapshot(`
      Array [
        "--a=b",
        "--foo=bar",
        "--a.b.c=1",
        "--c.b.a=0",
      ]
    `);
  });

  it('validates that bare values are not used', () => {
    expect(() => parseRawFlags(['--foo', 'bar'])).toThrowErrorMatchingInlineSnapshot(
      `"invalid CLI arg [bar], all args must start with \\"--\\" and values must be specified after an \\"=\\" in a single string per arg"`
    );
  });

  it('deduplciates --base-path, --no-base-path, and --server.basePath', () => {
    expect(parseRawFlags(['--no-base-path', '--server.basePath=foo', '--base-path=bar']))
      .toMatchInlineSnapshot(`
      Array [
        "--base-path=bar",
      ]
    `);
  });

  it('allows duplicates for --plugin-path', () => {
    expect(parseRawFlags(['--plugin-path=foo', '--plugin-path=bar'])).toMatchInlineSnapshot(`
      Array [
        "--plugin-path=foo",
        "--plugin-path=bar",
      ]
    `);
  });
});

describe('getArgValue()', () => {
  const args = parseRawFlags(['--foo=bar', '--bar=baz', '--foo=foo']);

  it('extracts the value of a specific flag by name', () => {
    expect(getArgValue(args, 'foo')).toBe('foo');
  });
});

describe('getKibanaCliArg()', () => {
  it('parses the raw flags and then extracts the value', () => {
    expect(getKibanaCliArg(['--foo=bar', '--foo=foo'], 'foo')).toBe('foo');
  });

  it('parses the value as JSON if valid', () => {
    expect(getKibanaCliArg(['--foo=["foo"]'], 'foo')).toEqual(['foo']);
    expect(getKibanaCliArg(['--foo=null'], 'foo')).toBe(null);
    expect(getKibanaCliArg(['--foo=1'], 'foo')).toBe(1);
    expect(getKibanaCliArg(['--foo=10.10'], 'foo')).toBe(10.1);
  });

  it('returns an array for flags which are valid duplicates', () => {
    expect(getKibanaCliArg(['--plugin-path=foo', '--plugin-path=bar'], 'plugin-path')).toEqual([
      'foo',
      'bar',
    ]);
  });
});

describe('getKibanaCliLoggers()', () => {
  it('parses the --logging.loggers value to an array', () => {
    expect(getKibanaCliLoggers(['--logging.loggers=[{"foo":1}]'])).toEqual([
      {
        foo: 1,
      },
    ]);
  });

  it('returns an array for invalid values', () => {
    expect(getKibanaCliLoggers([])).toEqual([]);
    expect(getKibanaCliLoggers(['--logging.loggers=null'])).toEqual([]);
    expect(getKibanaCliLoggers(['--logging.loggers.foo=name'])).toEqual([]);
    expect(getKibanaCliLoggers(['--logging.loggers={}'])).toEqual([]);
    expect(getKibanaCliLoggers(['--logging.loggers=1'])).toEqual([]);
  });
});
