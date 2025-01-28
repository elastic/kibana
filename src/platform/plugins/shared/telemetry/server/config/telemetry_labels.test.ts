/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { labelsSchema } from './telemetry_labels';

describe('labelsSchema', () => {
  test('does not allow environment variables that are not strings', () => {
    expect(() => {
      labelsSchema.validate({ environment: 1234 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"[environment]: expected value of type [string] but got [number]"`
    );
  });
  test('with environment set', () => {
    expect(labelsSchema.validate({ environment: 'foo' })).toEqual(
      expect.objectContaining({
        environment: 'foo',
      })
    );
  });
  test('set correct defaults', () => {
    expect(labelsSchema.validate({})).toMatchInlineSnapshot(`Object {}`);
  });
  test('does not allow unknowns', () => {
    expect(() => {
      labelsSchema.validate({ foo: 'bar' });
    }).toThrowErrorMatchingInlineSnapshot(`"[foo]: definition for this key is missing"`);
  });
});
