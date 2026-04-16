/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import path from 'node:path';
import { toRepoRelativePath } from './paths';
import { sanitizePathSegment } from './sanitize_path_segment';

const createStableHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 8);

export interface VisualTestTargetIdentity {
  projectName: string;
  location: string;
  arch: string;
  domain: string;
}

export const createVisualTestKey = (
  testFile: string,
  testTitle: string,
  target: VisualTestTargetIdentity
): string => {
  const relativeTestFile = toRepoRelativePath(testFile);
  const parsedTestFile = path.parse(relativeTestFile);
  const fileKey = sanitizePathSegment(parsedTestFile.name, 'test', 24);
  const titleKey = sanitizePathSegment(testTitle, 'test', 48);
  const targetKey = sanitizePathSegment(
    `${target.location}_${target.arch}_${target.domain}_${target.projectName}`,
    'default',
    40
  );
  // This is a stable hash of the test identity, not a run-specific value.
  const hash = createStableHash(
    `${relativeTestFile}::${testTitle}::${target.location}::${target.arch}::${target.domain}::${target.projectName}`
  );

  return `${fileKey}-${hash}-${titleKey}-${targetKey}`;
};
