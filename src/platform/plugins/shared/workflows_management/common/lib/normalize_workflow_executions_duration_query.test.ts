/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeWorkflowExecutionsDurationQuery } from './normalize_workflow_executions_duration_query';

describe('normalizeWorkflowExecutionsDurationQuery', () => {
  it('converts duration range values from human-readable units to milliseconds', () => {
    const normalized = normalizeWorkflowExecutionsDurationQuery({
      bool: {
        should: [
          {
            range: {
              duration: {
                gte: '2s',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });

    expect(normalized).toEqual({
      bool: {
        should: [
          {
            range: {
              duration: {
                gte: 2000,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('leaves plain numeric duration values unchanged', () => {
    const normalized = normalizeWorkflowExecutionsDurationQuery({
      range: {
        duration: {
          gte: '2000',
        },
      },
    });

    expect(normalized).toEqual({
      range: {
        duration: {
          gte: '2000',
        },
      },
    });
  });
});
