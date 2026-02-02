/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { simpleGit, type SimpleGit } from 'simple-git';
import { REPO_ROOT } from '@kbn/repo-info';
import type { TestCase } from '@playwright/test/reporter';

let git: SimpleGit;

export const getGitSHA1ForPath = async (p: string) => {
  if (git === undefined) git = simpleGit(REPO_ROOT);
  return (await git.raw(['ls-tree', '--object-only', 'HEAD', p])).trim();
};

export interface ScoutConfigManifest {
  path: string;
  exists: boolean;
  lastModified: string;
  sha1: string;
  tests: {
    id: string;
    title: string;
    expectedStatus: string;
    tags: string[];
    location: TestCase['location'];
  }[];
}
