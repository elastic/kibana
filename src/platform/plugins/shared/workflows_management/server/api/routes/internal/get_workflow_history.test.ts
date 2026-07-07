/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowHistoryQuerySchema } from './get_workflow_history';

describe('workflowHistoryQuerySchema', () => {
  it('accepts integer page and per_page values', () => {
    expect(workflowHistoryQuerySchema.validate({ page: 2, per_page: 50 })).toEqual({
      page: 2,
      per_page: 50,
    });
  });

  it('accepts omitted pagination params', () => {
    expect(workflowHistoryQuerySchema.validate({})).toEqual({});
  });

  it('rejects non-integer page values', () => {
    expect(() => workflowHistoryQuerySchema.validate({ page: 1.5 })).toThrow(
      'page must be an integer'
    );
  });

  it('rejects non-integer per_page values', () => {
    expect(() => workflowHistoryQuerySchema.validate({ per_page: 20.5 })).toThrow(
      'per_page must be an integer'
    );
  });

  it('rejects page values below 1', () => {
    expect(() => workflowHistoryQuerySchema.validate({ page: 0 })).toThrow(
      'Value must be equal to or greater than [1].'
    );
  });

  it('rejects non-integer page values at the boundary', () => {
    expect(() => workflowHistoryQuerySchema.validate({ page: 100.1 })).toThrow(
      'page must be an integer'
    );
  });
});
