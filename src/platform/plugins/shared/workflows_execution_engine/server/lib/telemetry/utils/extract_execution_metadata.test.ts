/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { extractCompositionContext } from './extract_execution_metadata';

/** Minimal fixture: extractCompositionContext only reads triggeredBy and context. */
function compositionFixture(
  triggeredBy: string,
  context: Record<string, unknown>
): EsWorkflowExecution {
  return { triggeredBy, context } as unknown as EsWorkflowExecution;
}

describe('extractCompositionContext', () => {
  it('returns empty object when not triggered by workflow-step', () => {
    expect(extractCompositionContext(compositionFixture('manual', {}))).toEqual({});
  });

  it('returns compositionDepth, parentWorkflowId, and parentWorkflowInvocation when set', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: 'parent-wf-id',
          parentWorkflowInvocation: 'sync',
        })
      )
    ).toEqual({
      compositionDepth: 1,
      parentWorkflowId: 'parent-wf-id',
      parentWorkflowInvocation: 'sync',
    });
  });

  it('includes parentWorkflowInvocation async', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowInvocation: 'async',
        })
      )
    ).toEqual({ compositionDepth: 1, parentWorkflowInvocation: 'async' });
  });

  it('uses compositionDepth 1 when parentDepth is not a number', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 'invalid',
          parentWorkflowId: 'parent-wf-id',
        })
      )
    ).toEqual({ compositionDepth: 1, parentWorkflowId: 'parent-wf-id' });
  });

  it('omits parentWorkflowId when empty string', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: '',
        })
      )
    ).toEqual({ compositionDepth: 1 });
  });

  it('omits parentWorkflowId when not a string', () => {
    expect(
      extractCompositionContext(
        compositionFixture('workflow-step', {
          parentDepth: 0,
          parentWorkflowId: 123,
        })
      )
    ).toEqual({ compositionDepth: 1 });
  });
});
