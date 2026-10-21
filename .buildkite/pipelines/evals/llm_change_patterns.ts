/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { minimatch } from 'minimatch';
import { hasDotSegment } from './skill_dirs.ts';

// Files whose content the model reads or follows: skills and agent instructions written as text,
// TypeScript skills, and prompt modules. Runtime skill markdown is detected separately because it
// depends on which directories hold a `SKILL.md`.
const LLM_CONTENT = [
  '**/*.md.text',
  '**/skills/**/*_skill.ts',
  '**/*_prompt.ts',
  '**/*_prompts.ts',
  '**/prompts.ts',
  '**/prompts/**/*.{ts,txt,text}',
];

// Look like LLM content by name but are not product behavior: UI, eval suites and their datasets,
// and tests. Dot-prefixed directories (`.agents/`, `.claude/`) hold developer tooling.
const NOT_PRODUCT_BEHAVIOR = [
  '**/public/**',
  '**/browser/**',
  '**/components/**',
  '**/application/**',
  '**/kbn-evals-suite-*/**',
  '**/evals/**',
  '**/test/**',
  '**/__tests__/**',
  '**/integration_tests/**',
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  '**/__snapshots__/**',
  '**/__mocks__/**',
];

const matchesAny = (path: string, globs: readonly string[]): boolean =>
  globs.some((glob) => minimatch(path, glob, { dot: true }));

/** Whether `path` is product code whose content shapes what a model sees or does. */
export const isLlmContentPath = (path: string): boolean =>
  !hasDotSegment(path) && matchesAny(path, LLM_CONTENT) && !matchesAny(path, NOT_PRODUCT_BEHAVIOR);
