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
  checkStepApprovals,
  formatStepApprovalFailure,
  readApprovedStepHash,
} from './step_approval';

const APPROVALS_DIR_RELATIVE = 'some/dir/approved_step_definitions';

describe('step approvals', () => {
  let approvalsDir: string;

  beforeEach(() => {
    approvalsDir = fs.mkdtempSync(Path.join(os.tmpdir(), 'wf-approvals-'));
  });

  afterEach(() => {
    fs.rmSync(approvalsDir, { recursive: true, force: true });
  });

  const approve = (stepId: string, hash: string) =>
    fs.writeFileSync(Path.join(approvalsDir, `${stepId}.txt`), `${hash}\n`);

  describe('readApprovedStepHash', () => {
    it('returns the trimmed hash from the step file', () => {
      approve('ns.step', 'abc123');
      expect(readApprovedStepHash(approvalsDir, 'ns.step')).toBe('abc123');
    });

    it('returns null when the step has no approval file', () => {
      expect(readApprovedStepHash(approvalsDir, 'ns.missing')).toBeNull();
    });

    it('rethrows read errors other than a missing file', () => {
      // A directory in place of the file makes readFileSync fail with EISDIR.
      fs.mkdirSync(Path.join(approvalsDir, 'ns.broken.txt'));
      expect(() => readApprovedStepHash(approvalsDir, 'ns.broken')).toThrow();
    });
  });

  describe('checkStepApprovals', () => {
    const run = (steps: Array<{ id: string; definitionHash: string }>) =>
      checkStepApprovals({ steps, approvalsDir, approvalsDirRelative: APPROVALS_DIR_RELATIVE });

    it('reports no issues when every step hash matches its approval', () => {
      approve('ns.a', 'h1');
      approve('ns.b', 'h2');
      expect(
        run([
          { id: 'ns.a', definitionHash: 'h1' },
          { id: 'ns.b', definitionHash: 'h2' },
        ])
      ).toEqual({
        issues: [],
        fixCommands: [],
      });
    });

    it('flags a step without an approval file and prints the approving command', () => {
      const { issues, fixCommands } = run([{ id: 'ns.new', definitionHash: 'h9' }]);
      expect(issues).toEqual(['Step "ns.new" is not in the approved list.']);
      expect(fixCommands).toEqual([`echo h9 > ${APPROVALS_DIR_RELATIVE}/ns.new.txt`]);
    });

    it('flags a step whose hash changed', () => {
      approve('ns.a', 'old');
      const { issues, fixCommands } = run([{ id: 'ns.a', definitionHash: 'new' }]);
      expect(issues).toEqual([
        'Step "ns.a" has an invalid definition hash (expected "old", got "new").',
      ]);
      expect(fixCommands).toEqual([`echo new > ${APPROVALS_DIR_RELATIVE}/ns.a.txt`]);
    });

    it('ignores approval files for steps that are not registered', () => {
      approve('ns.gone', 'h1');
      expect(run([]).issues).toEqual([]);
    });
  });

  describe('formatStepApprovalFailure', () => {
    it('lists the issues followed by the fix commands', () => {
      const message = formatStepApprovalFailure({
        issues: ['Step "ns.a" is not in the approved list.'],
        fixCommands: ['echo h > dir/ns.a.txt'],
      });
      expect(message).toContain('Found 1 unapproved step definition(s):');
      expect(message).toContain('  - Step "ns.a" is not in the approved list.');
      expect(message).toContain('request review from the workflows-eng team');
      expect(message.trim().endsWith('echo h > dir/ns.a.txt')).toBe(true);
    });
  });
});
