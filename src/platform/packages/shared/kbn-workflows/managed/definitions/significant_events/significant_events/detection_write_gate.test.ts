/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import DETECTION_YAML from './detection.yaml';
import { createWorkflowLiquidEngine } from '../../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface IWorkflowStep {
  name: string;
  if?: string;
  steps?: IWorkflowStep[];
  with?: Record<string, unknown>;
}

/** A document the workflow wrote for the rule: a detection or a scan marker. */
type TStoredRecord = Record<string, unknown>;

interface IScan {
  /** The change point type Elasticsearch reports for the rule in this scan. */
  type: string;
  /** Whether the lookup of the rule's previous record fails. */
  isLookupFailing?: boolean;
}

const RULE_UUID = 'rule-1';
const LOOKUP_STEP = 'check_last_scan';

const engine = createWorkflowLiquidEngine();

const ruleSteps = (parse(DETECTION_YAML) as { steps: IWorkflowStep[] }).steps.find(
  ({ name }) => name === 'foreach_rule'
)?.steps;

const getRuleStep = (name: string): IWorkflowStep => {
  const step = ruleSteps?.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Step ${name} not found`);
  return step;
};

/** Evaluates `${{ }}` to a typed value and renders any other template, like the workflow engine. */
const render = (template: unknown, context: object): unknown => {
  if (typeof template !== 'string') return template;
  if (!template.startsWith('${{')) return engine.parseAndRenderSync(template, context);
  return engine.evalValueSync(
    template.substring(template.indexOf('{{') + 2, template.lastIndexOf('}}')).trim(),
    context
  );
};

const renderWith = (stepName: string, context: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(getRuleStep(stepName).with ?? {}).map(([key, value]) => [
      key,
      render(value, context),
    ])
  );

/** The newest record the lookup step's query can match, honouring its `exists` filters. */
const findPrevious = (store: TStoredRecord[]): TStoredRecord | undefined => {
  const { body } = getRuleStep(LOOKUP_STEP).with as {
    body: { query: { bool: { filter: Array<{ exists?: { field: string } }> } } };
  };
  const requiredFields = body.query.bool.filter.flatMap(({ exists }) =>
    exists ? [exists.field] : []
  );
  return store.filter((record) => requiredFields.every((field) => field in record)).at(-1);
};

/** Runs one scan of the rule through the foreach steps and appends what it writes to `store`. */
const runScan = (store: TStoredRecord[], { type, isLookupFailing = false }: IScan): void => {
  const previous = findPrevious(store);
  const steps: Record<string, { output?: unknown; error?: unknown }> = {};
  const context = {
    foreach: { item: { key: RULE_UUID, change_points: { type: { [type]: { p_value: 1e-6 } } } } },
    variables: { batch_rule_uuids: [RULE_UUID] },
    steps,
  };

  steps.compute_rule_context = { output: renderWith('compute_rule_context', context) };
  steps[LOOKUP_STEP] = isLookupFailing
    ? { error: new Error('search failed') }
    : {
        output: {
          hits: {
            total: { value: previous ? 1 : 0 },
            hits: previous ? [{ _source: previous }] : [],
          },
        },
      };
  steps.compute_transition = { output: renderWith('compute_transition', context) };
  steps.compute_write_gate = { output: renderWith('compute_write_gate', context) };

  if (render(getRuleStep('write_detection').if, context) === true) {
    store.push({ rule_uuid: RULE_UUID, change_point_type: type });
  }
  if (render(getRuleStep('write_scan_marker').if, context) === true) {
    const { body } = getRuleStep('write_scan_marker').with as {
      body: { observed_change_point_type?: string };
    };
    const observed = render(body.observed_change_point_type, context);
    store.push({
      rule_uuid: RULE_UUID,
      ...(observed ? { observed_change_point_type: observed } : {}),
    });
  }
};

const countDetections = (scans: IScan[]): number => {
  const store: TStoredRecord[] = [];
  scans.forEach((scan) => runScan(store, scan));
  return store.filter((record) => 'change_point_type' in record).length;
};

describe('detection write gate', () => {
  it('writes a new detection when the rule changes again after a stationary scan', () => {
    expect(countDetections([{ type: 'spike' }, { type: 'stationary' }, { type: 'spike' }])).toBe(2);
  });

  it('writes one detection for a continuing incident', () => {
    expect(countDetections([{ type: 'spike' }, { type: 'spike' }, { type: 'spike' }])).toBe(1);
  });

  it('writes neither a detection nor a marker when the lookup fails', () => {
    const store: TStoredRecord[] = [];
    runScan(store, { type: 'spike' });
    runScan(store, { type: 'stationary' });
    runScan(store, { type: 'spike', isLookupFailing: true });

    expect(store).toEqual([
      { rule_uuid: RULE_UUID, change_point_type: 'spike' },
      { rule_uuid: RULE_UUID, observed_change_point_type: 'stationary' },
    ]);
  });

  it('reads a marker written before markers recorded the observed type as no previous type', () => {
    const store: TStoredRecord[] = [{ rule_uuid: RULE_UUID }];
    runScan(store, { type: 'spike' });

    expect(store.at(-1)).toEqual({ rule_uuid: RULE_UUID, change_point_type: 'spike' });
  });

  describe('lookup window', () => {
    const getTopStep = (name: string): IWorkflowStep => {
      const step = (parse(DETECTION_YAML) as { steps: IWorkflowStep[] }).steps.find(
        (candidate) => candidate.name === name
      );
      if (!step) throw new Error(`Step ${name} not found`);
      return step;
    };

    const windowMinutes = (inputs: Record<string, unknown>): unknown => {
      const variables: Record<string, unknown> = {};
      for (const name of ['compute_scan_gap', 'compute_gate_window']) {
        Object.entries(getTopStep(name).with ?? {}).forEach(([key, value]) => {
          variables[key] = render(value, { inputs, variables });
        });
      }
      return variables.gate_window_minutes;
    };

    it.each([
      // A one-run drop on the default schedule leaves 50 minutes between scans of a rule.
      ['now-40m', 30, 10, 50],
      // Coverage longer than the scan window.
      ['now-22m', 60, 10, 80],
      // A scan window longer than the gap, as on c0: a quiet rule ages out with the window.
      ['now-180m', 30, 10, 180],
    ])(
      'with lookback %s, %d minutes coverage and a %d minute interval, is %d minutes',
      (lookback, targetCoverageMinutes, detectionIntervalMinutes, expected) => {
        expect(windowMinutes({ lookback, targetCoverageMinutes, detectionIntervalMinutes })).toBe(
          expected
        );
      }
    );
  });
});
