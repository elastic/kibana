/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod/v4';
import { validateRecordKeysAllowed } from '../../common/utils';
import { commonIncidentSchemaObjectProperties } from './v1';

describe('validateRecordKeysAllowed for ServiceNow additional_fields', () => {
  it('returns an error if the keys are not allowed', () => {
    const ctx = {
      addIssue: jest.fn(),
    } as unknown as z.RefinementCtx;
    validateRecordKeysAllowed({
      record: { short_description: 'test' },
      ctx,
      disallowList: commonIncidentSchemaObjectProperties,
      fieldName: 'additional_fields',
    });
    expect(ctx.addIssue).toHaveBeenCalledTimes(1);
    expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
      code: 'custom',
      message:
        'The following properties cannot be defined inside additional_fields: short_description.',
      path: ['short_description'],
    });
  });
});
