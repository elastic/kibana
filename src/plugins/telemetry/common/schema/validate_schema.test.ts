/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assertTelemetryPayload } from './validate_schema';

describe('validateSchema', () => {
  test('successful', () => {
    expect(() =>
      assertTelemetryPayload(
        {
          an_object: {
            properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
          },
        },
        { an_object: { a_field: 'test' } }
      )
    ).not.toThrow();
  });
  test('failed', () => {
    expect(() =>
      assertTelemetryPayload(
        {
          an_object: {
            properties: { a_field: { type: 'keyword', _meta: { description: 'A test field' } } },
          },
        },
        { an_object: { other_field: 'test' } }
      )
    ).toThrowErrorMatchingSnapshot();
  });
});
