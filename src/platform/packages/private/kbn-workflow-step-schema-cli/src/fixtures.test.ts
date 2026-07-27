/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import Path from 'path';
import {
  buildFixtureDeviationReport,
  diffDefinitions,
  loadApprovedDefinitions,
  parseApprovedTriggerIds,
} from './fixtures';

describe('parseApprovedTriggerIds', () => {
  it('extracts ids from the array and ignores the docstring example', () => {
    const source = `
      /**
       * Example of an approved trigger definition entry:
       * {
       *   id: 'cases.updated',
       *   schemaHash: 'abc',
       * }
       */
      export const APPROVED_TRIGGER_DEFINITIONS = [
        { id: 'alerting.ruleCreated', schemaHash: 'a' },
        { id: 'cases.caseCreated', schemaHash: 'b' }, // inline comment id: 'nope'
        { id: 'workflows.failed', schemaHash: 'c' },
      ];
    `;
    expect(parseApprovedTriggerIds(source)).toEqual([
      'alerting.ruleCreated',
      'cases.caseCreated',
      'workflows.failed',
    ]);
  });
});

describe('diffDefinitions', () => {
  it('reports missing (approved - produced) and unexpected (produced - approved)', () => {
    const diff = diffDefinitions(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(diff.missing).toEqual(['a']);
    expect(diff.unexpected).toEqual(['d']);
  });

  it('is empty when produced is a superset of approved', () => {
    const diff = diffDefinitions(['a', 'b'], ['a', 'b', 'c']);
    expect(diff.missing).toEqual([]);
    expect(diff.unexpected).toEqual(['c']);
  });
});

describe('buildFixtureDeviationReport', () => {
  it('diffs steps and triggers independently', () => {
    const report = buildFixtureDeviationReport(
      { stepIds: ['cases.createCase', 'contextEngine.addEntry'], triggerIds: ['cases.caseCreated'] },
      { stepTypes: ['cases.createCase', 'slack', 'if'], triggerTypes: ['cases.caseCreated', 'manual'] }
    );
    expect(report.steps.missing).toEqual(['contextEngine.addEntry']);
    expect(report.triggers.missing).toEqual([]);
    expect(report.triggers.unexpected).toEqual(['manual']);
  });
});

describe('loadApprovedDefinitions', () => {
  it('reads step ids from .txt filenames and trigger ids from the .ts array', () => {
    const dir = fs.mkdtempSync(Path.join(os.tmpdir(), 'wf-fixtures-'));
    const stepDir = Path.join(dir, 'approved_step_definitions');
    fs.mkdirSync(stepDir);
    fs.writeFileSync(Path.join(stepDir, 'cases.createCase.txt'), '{}');
    fs.writeFileSync(Path.join(stepDir, 'data.set.txt'), '{}');
    fs.writeFileSync(Path.join(stepDir, 'ignore.md'), 'not a step');
    fs.writeFileSync(
      Path.join(dir, 'approved_trigger_definitions.ts'),
      `export const APPROVED_TRIGGER_DEFINITIONS = [{ id: 'cases.caseCreated', schemaHash: 'x' }];`
    );

    const approved = loadApprovedDefinitions(dir);
    expect(approved.stepIds).toEqual(['cases.createCase', 'data.set']);
    expect(approved.triggerIds).toEqual(['cases.caseCreated']);
  });
});
