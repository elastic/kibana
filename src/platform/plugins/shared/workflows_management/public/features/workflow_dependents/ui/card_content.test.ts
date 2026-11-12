/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getCalledCardContent, getCallerCardContent } from './card_content';
import type {
  CallSiteImpact,
  DependentImpact,
  ImpactIssue,
  UpstreamImpact,
  WorkflowContract,
} from '../../../../common/lib/workflow_dependents/types';

const callSite = (overrides: Partial<CallSiteImpact> = {}): CallSiteImpact => ({
  stepName: 'get_context',
  stepType: 'workflow.execute',
  isDynamicInputs: false,
  inputs: [{ name: 'alert_id', value: 'a-1', isProvided: true, isRequired: true, status: 'ok' }],
  outputs: [{ field: 'severity', status: 'ok' }],
  ...overrides,
});

const issue = (overrides: Partial<ImpactIssue>): ImpactIssue => ({
  kind: 'missingRequiredInput',
  severity: 'breaking',
  stepName: 'get_context',
  field: 'tenant',
  isNew: true,
  ...overrides,
});

const dependent = (overrides: Partial<DependentImpact> = {}): DependentImpact => ({
  workflowId: 'triage',
  workflowName: 'Triage',
  enabled: true,
  status: 'safe',
  callSites: [callSite()],
  issues: [],
  upstream: [],
  ...overrides,
});

const upstream = (count: number, effect: UpstreamImpact['effect']): UpstreamImpact[] =>
  Array.from({ length: count }, (_, position) => ({
    workflowId: `parent-${position}`,
    workflowName: `Parent ${position}`,
    effect,
    viaName: 'Triage',
    field: effect === 'missingOutput' ? 'severity' : undefined,
  }));

describe('getCallerCardContent', () => {
  it('lists what the caller sends and uses', () => {
    const { verdict, details } = getCallerCardContent(dependent(), 'Alert context', false);

    expect(verdict).toBe('Works with Alert context');
    expect(details.map(({ items }) => items)).toEqual([['alert_id: a-1'], ['severity']]);
  });

  it('splits problems into new and earlier ones, breaking first', () => {
    const { problems, earlierProblems } = getCallerCardContent(
      dependent({
        status: 'breaking',
        issues: [
          issue({ kind: 'unknownInput', severity: 'warning', field: 'extra' }),
          issue({}),
          issue({ field: 'region', isNew: false }),
        ],
      }),
      'Alert context',
      true
    );

    expect(problems.map(({ severity }) => severity)).toEqual(['breaking', 'warning']);
    expect(problems[0].message).toBe(
      'Doesn’t send the input "tenant", which Alert context requires'
    );
    expect(earlierProblems.map(({ message }) => message)).toEqual([
      'Doesn’t send the input "region", which Alert context requires',
    ]);
  });

  it('names the step when the caller runs the workflow from more than one step', () => {
    const { problems } = getCallerCardContent(
      dependent({
        status: 'breaking',
        callSites: [callSite(), callSite({ stepName: 'retry' })],
        issues: [issue({ stepName: 'retry' })],
      }),
      'Alert context',
      true
    );

    expect(problems[0].message).toContain('(step "retry")');
  });

  it('says a turned-off caller has no runs to break', () => {
    const content = getCallerCardContent(
      dependent({ enabled: false, status: 'warning' }),
      'Alert context',
      true
    );

    expect(content.isTurnedOff).toBe(true);
    expect(content.verdict).toBe(
      'Turned off, so saving doesn’t break any runs. It might break if it’s turned back on'
    );
  });

  it('describes the workflows further up the chain', () => {
    const { notes } = getCallerCardContent(
      dependent({
        status: 'breaking',
        upstream: [...upstream(6, 'fails'), ...upstream(7, 'missingOutput')],
      }),
      'Alert context',
      true
    );

    expect(notes[0]).toBe(
      'Parent 0, Parent 1, Parent 2, Parent 3, Parent 4 and 1 more will fail too, because they run Triage, directly or through other workflows.'
    );
    expect(notes[1]).toBe(
      'Parent 0 keeps running, but gets nothing for the output "severity" of Triage, which comes from here.'
    );
    expect(notes).toHaveLength(7);
    expect(notes[6]).toBe('2 more workflows get empty values further up.');
  });

  it('explains empty inputs and outputs', () => {
    const { details } = getCallerCardContent(
      dependent({
        callSites: [
          callSite({
            stepType: 'workflow.executeAsync',
            isDynamicInputs: true,
            inputs: [],
            outputs: [],
          }),
        ],
      }),
      'Alert context',
      false
    );

    expect(details.map(({ emptyText }) => emptyText)).toEqual([
      'Computed while running',
      'None. It starts Alert context in the background and doesn’t wait for it.',
    ]);
  });
});

describe('getCalledCardContent', () => {
  const contract: WorkflowContract = {
    enabled: true,
    valid: true,
    inputs: {
      alert_id: { name: 'alert_id', type: 'string', required: true, hasDefault: false },
      limit: { name: 'limit', type: 'number', required: true, hasDefault: true },
    },
    hasDeclaredInputs: true,
    rejectsUnknownInputs: false,
    outputs: {
      severity: { name: 'severity', required: false, hasDefault: false },
      score: { name: 'score', required: false, hasDefault: false },
    },
    outputsSource: 'declared',
    unreturnedOutputs: ['score'],
  };

  it('lists what the called workflow accepts and returns', () => {
    const { details, verdict } = getCalledCardContent({
      workflowId: 'alert-context',
      workflowName: 'Alert context',
      status: 'safe',
      callSites: [callSite()],
      issues: [],
      contract,
    });

    expect(verdict).toBe(
      'Works: it sends what Alert context needs and only uses outputs it returns'
    );
    expect(details.slice(2).map(({ items }) => items)).toEqual([
      ['alert_id: string, required', 'limit: number, optional'],
      ['severity'],
    ]);
  });

  it('falls back to the ID when the workflow does not exist', () => {
    const content = getCalledCardContent({
      workflowId: 'missing-id',
      status: 'breaking',
      callSites: [callSite()],
      issues: [issue({ kind: 'childNotFound', field: '' })],
    });

    expect(content.name).toBe('missing-id');
    expect(content.verdict).toBe('Will fail when it runs');
    expect(content.details).toEqual([]);
  });
});
