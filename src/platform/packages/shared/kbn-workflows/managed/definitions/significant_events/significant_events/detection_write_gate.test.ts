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

interface WorkflowStep {
  name: string;
  if?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
}

/** A document the workflow wrote for the rule: a detection or a scan marker. */
interface StoredRecord {
  /** When the record was written, in minutes since the first scan. */
  atMinute: number;
  [field: string]: unknown;
}

interface Scan {
  /** The change point type Elasticsearch reports for the rule in this scan; '' when inconclusive. */
  type: string;
  /** When the scan runs, in minutes since the first scan. */
  atMinute: number;
  /** Whether the lookup of the rule's previous record fails. */
  isLookupFailing?: boolean;
}

interface LookupFilter {
  exists?: { field: string };
  bool?: { should: LookupFilter[] };
  range?: { '@timestamp': { gte: string } };
}

const RULE_UUID = 'rule-1';
const LOOKUP_STEP = 'check_last_scan';
const SCAN_INTERVAL_MINUTES = 10;
// The default schedule: a 50 minute scan gap.
const INPUTS = { targetCoverageMinutes: 30, detectionIntervalMinutes: SCAN_INTERVAL_MINUTES };
// The critical profile's default lookback, which the scan route reports per rule.
const LOOKBACK_MINUTES = 40;

const engine = createWorkflowLiquidEngine();

const topSteps = (parse(DETECTION_YAML) as { steps: WorkflowStep[] }).steps;
const ruleSteps = topSteps.find(({ name }) => name === 'foreach_rule')?.steps;

const findStep = (steps: WorkflowStep[] | undefined, name: string): WorkflowStep => {
  const step = steps?.find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Step ${name} not found`);
  return step;
};

const getRuleStep = (name: string): WorkflowStep => findStep(ruleSteps, name);

/** Evaluates `${{ }}` to a typed value and renders any other template, like the workflow engine. */
const render = (template: unknown, context: object): unknown => {
  if (typeof template !== 'string') return template;
  if (!template.startsWith('${{')) return engine.parseAndRenderSync(template, context);
  return engine.evalValueSync(
    template.substring(template.indexOf('{{') + 2, template.lastIndexOf('}}')).trim(),
    context
  );
};

const renderWith = (step: WorkflowStep, context: object): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(step.with ?? {}).map(([key, value]) => [key, render(value, context)])
  );

const getScanGapVariables = (inputs: Record<string, unknown>): Record<string, unknown> =>
  renderWith(findStep(topSteps, 'compute_scan_gap'), { inputs });

const createContext = ({
  type,
  lookbackMinutes,
  inputs = INPUTS,
}: {
  type: string;
  lookbackMinutes: number;
  inputs?: Record<string, unknown>;
}) => ({
  foreach: {
    item: {
      key: RULE_UUID,
      lookback_minutes: lookbackMinutes,
      change_points: { type: type ? { [type]: { p_value: 1e-6 } } : {} },
    },
  },
  variables: { batch_rule_uuids: [RULE_UUID], ...getScanGapVariables(inputs) },
  steps: {} as Record<string, { output?: unknown; error?: unknown }>,
});

/** Whether a record matches one of the lookup query's filters; the rule_uuid term always does. */
const matchesFilter = (
  filter: LookupFilter,
  record: StoredRecord,
  { atMinute, context }: { atMinute: number; context: object }
): boolean => {
  if (filter.exists) return filter.exists.field in record;
  if (filter.bool) {
    return filter.bool.should.some((clause) =>
      matchesFilter(clause, record, { atMinute, context })
    );
  }
  if (filter.range) {
    const gte = String(render(filter.range['@timestamp'].gte, context));
    return atMinute - record.atMinute <= Number(gte.replace(/^now-|m$/g, ''));
  }
  return true;
};

/** The newest record the lookup step's query can match. */
const findPrevious = (
  store: StoredRecord[],
  options: { atMinute: number; context: object }
): StoredRecord | undefined => {
  const { body } = getRuleStep(LOOKUP_STEP).with as {
    body: { query: { bool: { filter: LookupFilter[] } } };
  };
  return store
    .filter((record) =>
      body.query.bool.filter.every((filter) => matchesFilter(filter, record, options))
    )
    .at(-1);
};

/** Runs one scan of the rule through the foreach steps and appends what it writes to `store`. */
const runScan = (
  store: StoredRecord[],
  { type, atMinute, isLookupFailing = false }: Scan
): void => {
  const context = createContext({ type, lookbackMinutes: LOOKBACK_MINUTES });
  const { steps } = context;

  steps.compute_rule_context = { output: renderWith(getRuleStep('compute_rule_context'), context) };
  const previous = findPrevious(store, { atMinute, context });
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
  steps.compute_transition = { output: renderWith(getRuleStep('compute_transition'), context) };
  steps.compute_write_gate = { output: renderWith(getRuleStep('compute_write_gate'), context) };

  if (render(getRuleStep('write_detection').if, context) === true) {
    store.push({ rule_uuid: RULE_UUID, change_point_type: type, atMinute });
  }
  if (render(getRuleStep('write_scan_marker').if, context) === true) {
    const { body } = getRuleStep('write_scan_marker').with as {
      body: { observed_change_point_type?: string };
    };
    const observed = render(body.observed_change_point_type, context);
    store.push({
      rule_uuid: RULE_UUID,
      ...(observed ? { observed_change_point_type: observed } : {}),
      atMinute,
    });
  }
};

/** Runs the scans one interval apart unless a scan sets its own time, and returns the store. */
const runScans = (
  scans: Array<Omit<Scan, 'atMinute'> & Partial<Pick<Scan, 'atMinute'>>>,
  store: StoredRecord[] = []
): StoredRecord[] => {
  scans.forEach((scan, index) =>
    runScan(store, { atMinute: index * SCAN_INTERVAL_MINUTES, ...scan })
  );
  return store;
};

const countDetections = (scans: Parameters<typeof runScans>[0]): number =>
  runScans(scans).filter((record) => 'change_point_type' in record).length;

describe('detection write gate', () => {
  it('writes a new detection when the rule changes again after a stationary scan', () => {
    expect(countDetections([{ type: 'spike' }, { type: 'stationary' }, { type: 'spike' }])).toBe(2);
  });

  it('writes one detection for a continuing incident', () => {
    expect(countDetections([{ type: 'spike' }, { type: 'spike' }, { type: 'spike' }])).toBe(1);
  });

  it('writes one detection when an inconclusive scan interrupts the incident', () => {
    expect(countDetections([{ type: 'spike' }, { type: '' }, { type: 'spike' }])).toBe(1);
  });

  it.each([
    [50, 1],
    [51, 2],
  ])(
    'with the next spike %d minutes later, past a 50 minute window, writes %d detections',
    (atMinute, expected) => {
      expect(countDetections([{ type: 'spike' }, { type: 'spike', atMinute }])).toBe(expected);
    }
  );

  it('writes neither a detection nor a marker when the lookup fails', () => {
    const store = runScans([
      { type: 'spike' },
      { type: 'stationary' },
      { type: 'spike', isLookupFailing: true },
    ]);

    expect(store).toEqual([
      { rule_uuid: RULE_UUID, change_point_type: 'spike', atMinute: 0 },
      { rule_uuid: RULE_UUID, observed_change_point_type: 'stationary', atMinute: 10 },
    ]);
  });

  it('looks past a marker written before markers recorded the observed type', () => {
    const store = runScans(
      [{ type: 'spike' }],
      [
        { rule_uuid: RULE_UUID, change_point_type: 'spike', atMinute: -20 },
        { rule_uuid: RULE_UUID, atMinute: -10 },
      ]
    );

    expect(store.filter((record) => 'change_point_type' in record)).toHaveLength(1);
  });

  describe('lookup window', () => {
    it.each([
      // A one-run drop on the default schedule leaves 50 minutes between scans of a rule.
      [40, 30, 10, 50],
      // A scan window longer than the gap, as on c0: a quiet rule ages out with the window.
      [180, 30, 10, 180],
      // Fractional settings round up, since ES date math takes whole minutes.
      [40, 30.5, 10, 51],
    ])(
      'with a %d minute scan, %d minutes coverage and a %d minute interval, is %d minutes',
      (lookbackMinutes, targetCoverageMinutes, detectionIntervalMinutes, expected) => {
        const context = createContext({
          type: 'spike',
          lookbackMinutes,
          inputs: { targetCoverageMinutes, detectionIntervalMinutes },
        });

        expect(renderWith(getRuleStep('compute_rule_context'), context).gate_window_minutes).toBe(
          expected
        );
      }
    );
  });
});
