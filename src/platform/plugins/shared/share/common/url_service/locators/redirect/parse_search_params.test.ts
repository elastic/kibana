/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseSearchParams } from './parse_search_params';

test('parses a well constructed URL path search part', () => {
  const res = parseSearchParams(`?l=LOCATOR&v=0.0.0&p=${encodeURIComponent('{"foo":"bar"}')}`);

  expect(res).toEqual({
    id: 'LOCATOR',
    version: '0.0.0',
    params: {
      foo: 'bar',
    },
  });
});

test('throws on missing locator ID', () => {
  expect(() =>
    parseSearchParams(`?v=0.0.0&p=${encodeURIComponent('{"foo":"bar"}')}`)
  ).toThrowErrorMatchingInlineSnapshot(
    `"Locator ID not specified. Specify \\"l\\" search parameter in the URL, which should be an existing locator ID."`
  );

  expect(() =>
    parseSearchParams(`?l=&v=0.0.0&p=${encodeURIComponent('{"foo":"bar"}')}`)
  ).toThrowErrorMatchingInlineSnapshot(
    `"Locator ID not specified. Specify \\"l\\" search parameter in the URL, which should be an existing locator ID."`
  );
});

test('throws on missing version', () => {
  expect(() =>
    parseSearchParams(`?l=LOCATOR&v=&p=${encodeURIComponent('{"foo":"bar"}')}`)
  ).toThrowErrorMatchingInlineSnapshot(
    `"Locator params version not specified. Specify \\"v\\" search parameter in the URL, which should be the release version of Kibana when locator params were generated."`
  );

  expect(() =>
    parseSearchParams(`?l=LOCATOR&p=${encodeURIComponent('{"foo":"bar"}')}`)
  ).toThrowErrorMatchingInlineSnapshot(
    `"Locator params version not specified. Specify \\"v\\" search parameter in the URL, which should be the release version of Kibana when locator params were generated."`
  );
});

test('throws on missing params', () => {
  expect(() => parseSearchParams(`?l=LOCATOR&v=1.1.1`)).toThrowErrorMatchingInlineSnapshot(
    `"Locator params not specified. Specify \\"p\\" search parameter in the URL, which should be JSON serialized object of locator params."`
  );

  expect(() => parseSearchParams(`?l=LOCATOR&v=1.1.1&p=`)).toThrowErrorMatchingInlineSnapshot(
    `"Locator params not specified. Specify \\"p\\" search parameter in the URL, which should be JSON serialized object of locator params."`
  );
});

test('throws if params are not JSON', () => {
  expect(() => parseSearchParams(`?l=LOCATOR&v=1.1.1&p=asdf`)).toThrowErrorMatchingInlineSnapshot(
    `"Could not parse locator params. Locator params must be serialized as JSON and set at \\"p\\" URL search parameter."`
  );
});
