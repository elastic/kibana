/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

export interface RegisteredStepHash {
  id: string;
  definitionHash: string;
}

export interface StepApprovalResult {
  issues: string[];
  /** Shell commands (one per issue) that write the current hash to the approval file. */
  fixCommands: string[];
}

export interface CheckStepApprovalsOptions {
  steps: RegisteredStepHash[];
  /** Absolute directory holding one `<step.id>.txt` approval file per step. */
  approvalsDir: string;
  /** The same directory relative to the repo root, used in the printed fix commands. */
  approvalsDirRelative: string;
}

/** Read the approved hash for a step, or `null` when it has no approval file yet. */
export const readApprovedStepHash = (approvalsDir: string, stepId: string): string | null => {
  try {
    return Fs.readFileSync(Path.join(approvalsDir, `${stepId}.txt`), 'utf8').trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

/**
 * Compare every registered step's `definitionHash` with its approval file. A step
 * is unapproved when it has no file or its hash differs from the approved one.
 */
export const checkStepApprovals = ({
  steps,
  approvalsDir,
  approvalsDirRelative,
}: CheckStepApprovalsOptions): StepApprovalResult => {
  const issues: string[] = [];
  const fixCommands: string[] = [];

  for (const { id, definitionHash } of steps) {
    const approvedHash = readApprovedStepHash(approvalsDir, id);
    if (approvedHash === definitionHash) {
      continue;
    }
    issues.push(
      approvedHash === null
        ? `Step "${id}" is not in the approved list.`
        : `Step "${id}" has an invalid definition hash (expected "${approvedHash}", got "${definitionHash}").`
    );
    fixCommands.push(`echo ${definitionHash} > ${approvalsDirRelative}/${id}.txt`);
  }

  return { issues, fixCommands };
};

/** Human-readable failure message listing the issues and the commands that approve them. */
export const formatStepApprovalFailure = ({ issues, fixCommands }: StepApprovalResult): string =>
  [
    `Found ${issues.length} unapproved step definition(s):`,
    ...issues.map((issue) => `  - ${issue}`),
    '',
    'Run the following command(s) from your kibana directory and request review from the workflows-eng team:',
    '',
    ...fixCommands,
  ].join('\n');
