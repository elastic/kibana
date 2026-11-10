/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildExcludeManagedExecutionsFilter,
  buildExcludeStepRunsFilter,
  buildReadableWorkflowsFilter,
} from './workflow_executions_scope_filters';
import {
  buildManagedWorkflowExecutionsFilter,
  buildWorkflowExecutionsSearchQuery,
} from '../../../server/api/lib/build_workflow_executions_search_query';

describe('workflow executions scope filters', () => {
  it('excludes step runs like the executions list query', () => {
    const stepRunsClause = { exists: { field: 'stepId' } };
    const listQuery = buildWorkflowExecutionsSearchQuery(undefined, 'my-space');

    expect(listQuery?.bool?.must_not).toContainEqual(stepRunsClause);
    expect(buildExcludeStepRunsFilter().query).toEqual({ bool: { must_not: stepRunsClause } });
  });

  it('excludes managed executions like the executions list query', () => {
    const managedClause = buildManagedWorkflowExecutionsFilter();
    const listQuery = buildWorkflowExecutionsSearchQuery(undefined, 'my-space');

    expect(listQuery?.bool?.must_not).toContainEqual(managedClause);
    expect(buildExcludeManagedExecutionsFilter().query).toEqual({
      bool: { must_not: managedClause },
    });
  });

  it('limits the workflows to the given ids', () => {
    const filter = buildReadableWorkflowsFilter(['a', 'b']);

    expect(filter.query).toEqual({ terms: { workflowId: ['a', 'b'] } });
    expect(filter.meta.disabled).toBe(false);
    expect(filter.meta.negate).toBe(false);
  });
});
