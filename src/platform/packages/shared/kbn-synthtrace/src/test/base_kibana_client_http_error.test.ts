/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaClientHttpError } from '../lib/shared/base_kibana_client';

describe('KibanaClientHttpError', () => {
  it('appends serialized data to the stack when provided', () => {
    const errorData = { foo: 'bar', baz: 123 };
    const errorInstance = new KibanaClientHttpError('Example failure', 500, errorData);

    const errorStack = errorInstance.stack ?? '';
    const expectedSerializedData = `Data: ${JSON.stringify(errorData, null, 2)}`;

    expect(errorStack).toContain(expectedSerializedData);
  });

  it('falls back to stringifying non-serializable data', () => {
    const circularReference: Record<string, unknown> = {};
    circularReference.self = circularReference;

    const errorInstance = new KibanaClientHttpError('Circular failure', 400, circularReference);
    const errorStack = errorInstance.stack ?? '';

    expect(errorStack).toContain('Data: [object Object]');
  });

  it('does not append data when undefined', () => {
    const errorInstance = new KibanaClientHttpError('No data failure', 404);

    const errorStack = errorInstance.stack ?? '';

    expect(errorStack).not.toContain('Data:');
  });
});
