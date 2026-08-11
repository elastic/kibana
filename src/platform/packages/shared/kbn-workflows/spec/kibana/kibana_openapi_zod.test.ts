/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { add_case_comment_default_space_request } from './generated/schemas/kibana_openapi_zod.gen';

describe('add_case_comment_default_space_request.shape.body', () => {
  it('should be a valid zod schema', () => {
    expect(add_case_comment_default_space_request).toBeDefined();
  });
  it('should parse a simple comment', () => {
    const result = add_case_comment_default_space_request.shape.body.safeParse({
      caseId: '123',
      comment: 'test',
      owner: 'cases',
      type: 'user',
    });
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });
});
