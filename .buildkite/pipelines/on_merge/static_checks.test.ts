/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

interface PipelineStep {
  key?: string;
  depends_on?: string | string[];
}

const loadSteps = (file: string): PipelineStep[] =>
  parse(readFileSync(join(__dirname, file), 'utf8')).steps;

describe('on_merge static checks fragment', () => {
  const steps = loadSteps('static_checks.yml');

  it('defines exactly the six static steps', () => {
    expect(steps.map(({ key }) => key)).toEqual([
      'quick_checks',
      'checks',
      'linting',
      'linting_with_types',
      'check_types',
      'check_oas_snapshot',
    ]);
  });

  it('makes every step wait for pre_build', () => {
    expect(steps.map(({ depends_on: dependsOn }) => dependsOn)).toEqual(
      steps.map(() => 'pre_build')
    );
  });
});
