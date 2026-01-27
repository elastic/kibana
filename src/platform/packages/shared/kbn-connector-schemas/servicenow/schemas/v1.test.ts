/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import { validateOtherFieldsKeys } from './v1';

describe('validateOtherFieldsKeys', () => {
  it('returns an error if the keys are not allowed', () => {
    const ctx = {
      addIssue: jest.fn(),
    } as unknown as z.RefinementCtx;
    validateOtherFieldsKeys('short_description', ctx);
    expect(ctx.addIssue).toHaveBeenCalledTimes(1);
    expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
      code: 'custom',
      message:
        'The following properties cannot be defined inside additional_fields: short_description.',
    });
  });
});
