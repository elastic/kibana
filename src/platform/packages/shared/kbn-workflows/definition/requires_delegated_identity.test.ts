/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { requiresDelegatedIdentity } from './requires_delegated_identity';
import type { MaybeDelegatedIdentityCapableWorkflow } from './requires_delegated_identity';

// The predicate is deliberately defensive over raw definition shapes; fixtures below
// use minimal step objects, so cast once here instead of per-site.
const asWorkflow = (definition: unknown): MaybeDelegatedIdentityCapableWorkflow =>
  ({ definition: definition as never } as MaybeDelegatedIdentityCapableWorkflow);

const inheritStep = (name = 'inherit') => ({
  name,
  type: 'workflow.execute',
  with: { 'workflow-id': 'child', 'run-as-mode': 'inherit' },
});

const plainExecuteStep = {
  name: 'plain',
  type: 'workflow.execute',
  with: { 'workflow-id': 'child' },
};

describe('requiresDelegatedIdentity', () => {
  it('is true for a workflow whose unconditional execute step inherits', () => {
    expect(requiresDelegatedIdentity(asWorkflow({ steps: [inheritStep()], settings: {} }))).toBe(
      true
    );
  });

  it('is true for executeAsync with inherit', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [{ ...inheritStep(), type: 'workflow.executeAsync' }],
          settings: {},
        })
      )
    ).toBe(true);
  });

  it('is false when the workflow carries its own run_as', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [inheritStep()],
          settings: { run_as: 'service-account:space-worker' },
        })
      )
    ).toBe(false);
  });

  it('is false for execute steps without run-as-mode inherit', () => {
    expect(requiresDelegatedIdentity(asWorkflow({ steps: [plainExecuteStep] }))).toBe(false);
  });

  it('is true when an unconditional inherit follows a conditional block', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            { name: 'maybe', type: 'if', condition: 'true', steps: [plainExecuteStep] },
            inheritStep('always'),
          ],
        })
      )
    ).toBe(true);
  });

  it('is false when the only inherit is inside an if/else arm', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'route',
              type: 'if',
              condition: 'true',
              steps: [plainExecuteStep],
              else: [inheritStep('only_on_else')],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is in a switch case', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'route',
              type: 'switch',
              expression: '{{ inputs.mode }}',
              cases: [
                { match: 'auto', steps: [inheritStep('auto_only')] },
                { match: 'human', steps: [plainExecuteStep] },
              ],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is inside a foreach body', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'fan-out',
              type: 'foreach',
              foreach: '.items',
              steps: [inheritStep('per_item')],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is inside a while body', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'loop',
              type: 'while',
              condition: 'false',
              steps: [inheritStep('maybe_never')],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is in a static parallel branch', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'fan',
              type: 'parallel',
              branches: [
                { name: 'safe', steps: [plainExecuteStep] },
                { name: 'delegated', steps: [inheritStep('branch_only')] },
              ],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is behind a step-level if', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({ steps: [{ ...inheritStep('guarded'), if: '{{ inputs.delegate }}' }] })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is in a step on-failure fallback', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            { ...plainExecuteStep, 'on-failure': { fallback: [inheritStep('cleanup_only')] } },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false when the only inherit is in the workflow-level on-failure fallback', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [plainExecuteStep],
          settings: { 'on-failure': { fallback: [inheritStep('rescue_only')] } },
        })
      )
    ).toBe(false);
  });

  it('treats conditions as sticky below a conditional container', () => {
    expect(
      requiresDelegatedIdentity(
        asWorkflow({
          steps: [
            {
              name: 'loop',
              type: 'while',
              condition: 'true',
              steps: [
                {
                  name: 'route',
                  type: 'if',
                  condition: 'true',
                  steps: [inheritStep('nested_conditional')],
                },
              ],
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false for workflows without a definition or steps', () => {
    expect(requiresDelegatedIdentity(undefined)).toBe(false);
    expect(requiresDelegatedIdentity(asWorkflow(null))).toBe(false);
    expect(requiresDelegatedIdentity(asWorkflow({ steps: [] }))).toBe(false);
  });
});
