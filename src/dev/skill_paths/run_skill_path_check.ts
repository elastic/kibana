/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: implement

export interface SkillPathFinding {
  file: string;
  line: number;
  token: string;
  resolvedPath: string;
}

export interface SkillPathResult {
  findings: SkillPathFinding[];
  checked: number;
  skipped: number;
}

// Stub — returns empty result until implemented
export async function runSkillPathCheck(
  _skillFiles: string[],
  _repoRoot: string
): Promise<SkillPathResult> {
  return { findings: [], checked: 0, skipped: 0 };
}
