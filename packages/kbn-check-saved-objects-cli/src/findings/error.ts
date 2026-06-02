/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsCheckFinding } from './types';

/**
 * Thrown by validators to surface one or more structured findings. Each
 * finding is rendered as a separate entry in the PR comment so violations
 * can be grouped by `typeName`. Validators that detect a single problem
 * may pass a single finding; validators that detect multiple in one pass
 * (e.g. several SO types reusing previously-removed names) pass an array.
 */
export class SavedObjectsCheckError extends Error {
  public readonly findings: SavedObjectsCheckFinding[];

  constructor(findings: SavedObjectsCheckFinding | SavedObjectsCheckFinding[]) {
    const list = Array.isArray(findings) ? findings : [findings];
    super(list.map((f) => f.message).join('\n'));
    this.name = 'SavedObjectsCheckError';
    this.findings = list;
  }
}

export function isSavedObjectsCheckError(err: unknown): err is SavedObjectsCheckError {
  return err instanceof Error && err.name === 'SavedObjectsCheckError' && 'findings' in err;
}
