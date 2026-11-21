/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  NATIVE_VULN_SCANNER_REFRESH_WORKFLOW,
  NATIVE_VULN_SCANNER_SCAN_WORKFLOW,
  NATIVE_VULN_SCANNER_WORKFLOW_IDS,
} from '.';

interface YamlStep {
  name: string;
  type: string;
  condition?: string;
  steps?: YamlStep[];
  on_failure?: unknown;
  'on-failure'?: { continue?: boolean };
  with?: Record<string, unknown>;
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

describe('NATIVE_VULN_SCANNER_SCAN_WORKFLOW yaml', () => {
  const workflow = parse(NATIVE_VULN_SCANNER_SCAN_WORKFLOW.yaml) as {
    enabled?: boolean;
    settings: { concurrency: { key: string; strategy: string; max: number } };
    triggers: Array<{ type: string; with?: { every?: string } }>;
    steps: YamlStep[];
  };

  it('ships disabled so an operator turns the schedule on', () => {
    expect(workflow.enabled).toBe(false);
  });

  it('runs every 24h and on demand', () => {
    expect(workflow.triggers).toEqual([
      { type: 'scheduled', with: { every: '24h' } },
      { type: 'manual' },
    ]);
  });

  it('drops a run that starts while another is in progress', () => {
    expect(workflow.settings.concurrency).toEqual({
      key: 'native-vuln-scan',
      strategy: 'drop',
      max: 1,
    });
  });

  it('does not pin the run-as identity', () => {
    expect(NATIVE_VULN_SCANNER_SCAN_WORKFLOW.yaml).not.toContain('run_as');
  });

  it('runs fetch, match and summarize in that order, then fails the run when any of them failed', () => {
    expect(flatten(workflow.steps).map(({ type }) => type)).toEqual([
      'native_vuln.fetch_feed',
      'if',
      'native_vuln.match',
      'native_vuln.summarize',
      'if',
      'workflow.fail',
    ]);
  });

  it('lets every step before the failure gate fail so the summary is always written', () => {
    const tolerant = flatten(workflow.steps).filter(({ type }) => type.startsWith('native_vuln.'));
    expect(tolerant).toHaveLength(3);
    for (const step of tolerant) {
      expect(step['on-failure']).toEqual({ continue: true });
    }
  });

  it('uses if blocks rather than step-level if', () => {
    expect(NATIVE_VULN_SCANNER_SCAN_WORKFLOW.yaml).not.toMatch(/^\s+if:/m);
  });

  it('hands the match step only feed metadata', () => {
    const match = flatten(workflow.steps).find(({ type }) => type === 'native_vuln.match');
    expect(match?.with).toEqual({ feeds: '${{ steps.fetch_feed.output.feeds }}' });
  });

  it('lists exactly the workflows it defines for install and uninstall', () => {
    expect(NATIVE_VULN_SCANNER_WORKFLOW_IDS).toEqual([
      NATIVE_VULN_SCANNER_SCAN_WORKFLOW.id,
      'system-security-native-vuln-feed-refresh',
    ]);
  });
});

describe('NATIVE_VULN_SCANNER_REFRESH_WORKFLOW yaml', () => {
  const workflow = parse(NATIVE_VULN_SCANNER_REFRESH_WORKFLOW.yaml) as {
    enabled?: boolean;
    settings: { concurrency: { key: string; strategy: string; max: number } };
    triggers: Array<{ type: string; with?: { every?: string } }>;
    steps: YamlStep[];
  };

  it('ships disabled so an operator turns the schedule on', () => {
    expect(workflow.enabled).toBe(false);
  });

  it('runs hourly on the schedule only', () => {
    expect(workflow.triggers).toEqual([{ type: 'scheduled', with: { every: '1h' } }]);
  });

  it('shares the scan workflow concurrency key so a refresh never runs beside a full scan', () => {
    expect(workflow.settings.concurrency).toEqual({
      key: 'native-vuln-scan',
      strategy: 'drop',
      max: 1,
    });
    expect(parse(NATIVE_VULN_SCANNER_SCAN_WORKFLOW.yaml).settings.concurrency).toEqual(
      workflow.settings.concurrency
    );
  });

  it('does not pin the run-as identity', () => {
    expect(NATIVE_VULN_SCANNER_REFRESH_WORKFLOW.yaml).not.toContain('run_as');
  });

  it('runs the same steps as the scan workflow in the same order', () => {
    expect(flatten(workflow.steps).map(({ type }) => type)).toEqual(
      flatten(
        (parse(NATIVE_VULN_SCANNER_SCAN_WORKFLOW.yaml) as { steps: YamlStep[] }).steps
      ).map(({ type }) => type)
    );
  });

  it('lets every step before the failure gate fail so the summary is always written', () => {
    const tolerant = flatten(workflow.steps).filter(({ type }) => type.startsWith('native_vuln.'));
    expect(tolerant).toHaveLength(3);
    for (const step of tolerant) {
      expect(step['on-failure']).toEqual({ continue: true });
    }
  });

  it('hands the match step only feed metadata', () => {
    const match = flatten(workflow.steps).find(({ type }) => type === 'native_vuln.match');
    expect(match?.with).toEqual({ feeds: '${{ steps.fetch_feed.output.feeds }}' });
  });
});
