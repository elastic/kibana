/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { formatDiagnosticLocation, formatWorkflowDiagnostic } from './format_workflow_diagnostic';

const parsedWorkflow = {
  steps: [{ name: 'call' }, { name: 'notify' }],
} as unknown as WorkflowYaml;

const nestedWorkflow = {
  steps: [
    {
      name: 'fan_out',
      type: 'parallel',
      steps: [{ name: 'maybe_fail', type: 'kibana.request' }],
    },
    {
      name: 'scatter',
      type: 'parallel',
      branches: [
        { name: 'left', steps: [{ name: 'a', type: 'http' }] },
        { name: 'right', steps: [{ name: 'b', type: 'http' }] },
      ],
    },
  ],
} as unknown as WorkflowYaml;

describe('formatDiagnosticLocation', () => {
  it('returns undefined for empty/missing paths', () => {
    expect(formatDiagnosticLocation(undefined)).toBeUndefined();
    expect(formatDiagnosticLocation([])).toBeUndefined();
  });

  it('substitutes the step name when the path targets a step by index', () => {
    expect(formatDiagnosticLocation(['steps', 0, 'with', 'method'], parsedWorkflow)).toBe(
      'step "call" › with.method'
    );
  });

  it('falls back to a 1-based step number when the name is unknown', () => {
    expect(formatDiagnosticLocation(['steps', 5, 'with', 'url'])).toBe('step #6 › with.url');
  });

  it('handles a numeric-string step index', () => {
    expect(formatDiagnosticLocation(['steps', '0', 'with', 'method'], parsedWorkflow)).toBe(
      'step "call" › with.method'
    );
  });

  it('locates the steps segment even when it is not first in the path', () => {
    expect(formatDiagnosticLocation(['root', 'steps', 0, 'with', 'method'], parsedWorkflow)).toBe(
      'step "call" › with.method'
    );
  });

  it('resolves the full chain for a step nested in a parallel foreach body', () => {
    expect(formatDiagnosticLocation(['steps', 0, 'steps', 0, 'with', 'path'], nestedWorkflow)).toBe(
      'step "fan_out" › step "maybe_fail" › with.path'
    );
  });

  it('resolves branches inside a static parallel step', () => {
    expect(
      formatDiagnosticLocation(
        ['steps', 1, 'branches', 1, 'steps', 0, 'with', 'url'],
        nestedWorkflow
      )
    ).toBe('step "scatter" › branch "right" › step "b" › with.url');
  });

  it('falls back to numbered labels along the chain when names are unknown', () => {
    expect(formatDiagnosticLocation(['steps', 0, 'steps', 0, 'with', 'method'])).toBe(
      'step #1 › step #1 › with.method'
    );
  });

  it('labels the step itself when the path stops at the step', () => {
    expect(formatDiagnosticLocation(['steps', 1], parsedWorkflow)).toBe('step "notify"');
  });

  it('joins non-step paths with dots', () => {
    expect(formatDiagnosticLocation(['triggers', 0, 'type'])).toBe('triggers.0.type');
  });
});

describe('formatWorkflowDiagnostic', () => {
  it('annotates the message with the resolved location', () => {
    expect(
      formatWorkflowDiagnostic(
        { message: 'method expects string', path: ['steps', 0, 'with', 'method'] },
        parsedWorkflow
      )
    ).toBe('method expects string (at step "call" › with.method)');
  });

  it('strips the redundant Zod path suffix before appending the friendly location', () => {
    expect(
      formatWorkflowDiagnostic(
        {
          message: 'Invalid option: expected one of "GET"|"POST" at steps.0.with.method',
          path: ['steps', 0, 'with', 'method'],
        },
        parsedWorkflow
      )
    ).toBe('Invalid option: expected one of "GET"|"POST" (at step "call" › with.method)');
  });

  it('returns the bare message when there is no path', () => {
    expect(formatWorkflowDiagnostic({ message: 'Workflow is invalid', path: undefined })).toBe(
      'Workflow is invalid'
    );
  });
});
