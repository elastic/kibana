/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TestCase } from '@playwright/test/reporter';
import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';
import { computeTestID } from '../../helpers';

export interface ScoutTestIdentity {
  id: string;
  filePath: string;
  fullTitle: string;
}

const cache = new WeakMap<TestCase, ScoutTestIdentity>();

/**
 * Derives the repo-relative file path, full title and computed ID for a Playwright `TestCase`.
 * Shared by both reporters and memoized per `TestCase` so `computeTestID` isn't re-hashed on
 * every attempt and event.
 */
export function getTestIdentity(test: TestCase): ScoutTestIdentity {
  const cached = cache.get(test);
  if (cached) {
    return cached;
  }

  const filePath = path.relative(REPO_ROOT, test.location.file);
  // The first three elements of the title path are the root suite, project and test file path;
  // Scout's test titles and IDs never include them.
  const fullTitle = test.titlePath().slice(3).join(' ');
  const identity: ScoutTestIdentity = {
    id: computeTestID(filePath, fullTitle),
    filePath,
    fullTitle,
  };

  cache.set(test, identity);
  return identity;
}
