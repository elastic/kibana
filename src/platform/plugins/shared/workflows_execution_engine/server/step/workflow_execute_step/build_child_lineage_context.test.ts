/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildChildLineageContext } from './build_child_lineage_context';

describe('buildChildLineageContext', () => {
  it('uses the parent itself as the root when the parent is a top-level execution', () => {
    expect(
      buildChildLineageContext({
        context: { inputs: {} },
        id: 'top-exec-1',
        triggeredBy: 'manual',
      })
    ).toEqual({ rootWorkflowExecutionId: 'top-exec-1' });
  });

  it('uses the parent itself as the root when the parent has no context or trigger', () => {
    expect(buildChildLineageContext({ context: undefined, id: 'top-exec-1' })).toEqual({
      rootWorkflowExecutionId: 'top-exec-1',
    });
  });

  it('ignores lineage keys on a top-level parent and uses the parent itself', () => {
    expect(
      buildChildLineageContext({
        context: {
          parentWorkflowExecutionId: 'other-parent-exec',
          rootWorkflowExecutionId: 'other-exec',
        },
        id: 'top-exec-1',
        triggeredBy: 'scheduled',
      })
    ).toEqual({ rootWorkflowExecutionId: 'top-exec-1' });
  });

  it("copies the parent's stored root when the parent is itself a child", () => {
    expect(
      buildChildLineageContext({
        context: {
          parentWorkflowExecutionId: 'top-exec-1',
          parentWorkflowId: 'top-workflow-id',
          rootWorkflowExecutionId: 'top-exec-1',
        },
        id: 'child-exec-1',
        triggeredBy: 'workflow-step',
      })
    ).toEqual({ rootWorkflowExecutionId: 'top-exec-1' });
  });

  it('returns no root key when the parent is a child without a stored root', () => {
    expect(
      buildChildLineageContext({
        context: {
          parentWorkflowExecutionId: 'unknown-exec',
          parentWorkflowId: 'unknown-workflow-id',
        },
        id: 'pre-upgrade-child-exec',
        triggeredBy: 'workflow-step',
      })
    ).toEqual({});
  });

  it('returns no root key when the parent is a child whose stored root is not a string', () => {
    expect(
      buildChildLineageContext({
        context: { parentWorkflowExecutionId: 'unknown-exec', rootWorkflowExecutionId: 7 },
        id: 'child-exec-1',
        triggeredBy: 'workflow-step',
      })
    ).toEqual({});
  });
});
