/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getContentType } from './es';

const APPLICATION_JSON = 'application/json';
describe('Content type', () => {
  test('body', () => {
    const contentType = getContentType(
      [
        JSON.stringify({
          foo: 'baz',
        }),
        JSON.stringify({
          foo: 'bar',
        }),
      ].join('\n')
    );

    expect(contentType).toEqual(APPLICATION_JSON);
  });

  test('no body', () => {
    const contentType = getContentType('');

    expect(contentType).toBeUndefined();
  });
});
