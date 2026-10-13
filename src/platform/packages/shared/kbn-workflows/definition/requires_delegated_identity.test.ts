/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { requiresDelegatedIdentity } from './requires_delegated_identity';

const inheritStep = (type: 'workflow.execute' | 'workflow.executeAsync' = 'workflow.execute') => ({
  name: `step-${type}`,
  type,
  with: { 'workflow-id': 'child', 'run-as-mode': 'inherit' },
});

const plainExecuteStep = {
  name: 'plain',
  type: 'workflow.execute',
  with: { 'workflow-id': 'child' },
};

describe('requiresDelegatedIdentity', () => {
  it('is true for a workflow whose execute step inherits a service account', () => {
    expect(
      requiresDelegatedIdentity({
        definition: { steps: [inheritStep()], settings: {} },
      })
    ).toBe(true);
  });

  it('is true for executeAsync with inherit', () => {
    expect(
      requiresDelegatedIdentity({
        definition: { steps: [inheritStep('workflow.executeAsync')], settings: {} },
      })
    ).toBe(true);
  });

  it('is false when the workflow carries its own run_as', () => {
    expect(
      requiresDelegatedIdentity({
        definition: {
          steps: [inheritStep()],
          settings: { run_as: 'service-account:space-worker' },
        },
      })
    ).toBe(false);
  });

  it('is false for execute steps without run-as-mode inherit', () => {
    expect(requiresDelegatedIdentity({ definition: { steps: [plainExecuteStep] } })).toBe(false);
  });

  it('detects inherit steps nested inside foreach/parallel branches', () => {
    expect(
      requiresDelegatedIdentity({
        definition: {
          steps: [
            {
              name: 'fan-out',
              type: 'foreach',
              foreach: '.items',
              steps: [inheritStep()],
            },
          ],
        },
      })
    ).toBe(true);
  });

  it('is false for workflows without a definition or steps', () => {
    expect(requiresDelegatedIdentity(undefined)).toBe(false);
    expect(requiresDelegatedIdentity({ definition: null })).toBe(false);
    expect(requiresDelegatedIdentity({ definition: { steps: [] } })).toBe(false);
  });
});
