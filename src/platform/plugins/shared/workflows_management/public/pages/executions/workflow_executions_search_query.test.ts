/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getWorkflowExecutionsFetchErrorMessage,
  isWorkflowExecutionsIndexNotFoundError,
} from './workflow_executions_search_query';

describe('workflow_executions_search_query', () => {

  describe('isWorkflowExecutionsIndexNotFoundError', () => {
    it('returns true for an EsError-shaped index_not_found_exception', () => {
      const error = {
        attributes: { error: { type: 'index_not_found_exception', reason: 'missing' } },
      };

      expect(isWorkflowExecutionsIndexNotFoundError(error)).toBe(true);
    });

    it('returns true for a response error-shaped index_not_found_exception', () => {
      const error = {
        body: { error: { type: 'index_not_found_exception', reason: 'missing' } },
      };

      expect(isWorkflowExecutionsIndexNotFoundError(error)).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isWorkflowExecutionsIndexNotFoundError(new Error('other'))).toBe(false);
    });
  });

  describe('getWorkflowExecutionsFetchErrorMessage', () => {
    it('returns a generic message', () => {
      expect(getWorkflowExecutionsFetchErrorMessage()).toBe('Failed to load executions');
    });
  });
});
