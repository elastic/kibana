/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { executionIdParamSchema, idParamSchema, workflowIdParamSchema } from './schemas';

describe.each([
  { parameter: 'id', schema: idParamSchema },
  { parameter: 'executionId', schema: executionIdParamSchema },
  { parameter: 'workflowId', schema: workflowIdParamSchema },
])('$parameter route parameter', ({ parameter, schema }) => {
  it('accepts an ID at the length limit', () => {
    const params = { [parameter]: 'a'.repeat(512) };
    expect(schema.validate(params)).toEqual(params);
  });

  it('rejects an ID above the length limit', () => {
    expect(() => schema.validate({ [parameter]: 'a'.repeat(513) })).toThrow(
      'value has length [513] but it must have a maximum length of [512]'
    );
  });
});
