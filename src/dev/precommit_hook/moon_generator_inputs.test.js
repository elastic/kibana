/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMoonAffectedProjectNames, isMoonGeneratorInput } from './moon_generator_inputs';

describe('dev/precommit_hook/moon_generator_inputs', () => {
  it('treats generator inputs as moon-relevant, not only moon.yml', () => {
    expect(isMoonGeneratorInput('pkg/kibana.jsonc')).toBe(true);
    expect(isMoonGeneratorInput('pkg/tsconfig.json')).toBe(true);
    expect(isMoonGeneratorInput('pkg/package.json')).toBe(true);
    expect(isMoonGeneratorInput('pkg/jest.config.js')).toBe(true);
    expect(isMoonGeneratorInput('pkg/moon.extend.yml')).toBe(true);
    expect(isMoonGeneratorInput('pkg/src/index.ts')).toBe(false);
  });

  it('maps generator input paths to package names', () => {
    expect(
      getMoonAffectedProjectNames(['pkg/kibana.jsonc', 'pkg/src/index.ts', 'other/tsconfig.json'], {
        pkg: '@kbn/pkg',
      })
    ).toEqual(['@kbn/pkg']);
  });

  it('maps a renamed-away moon.yml path to its project', () => {
    expect(getMoonAffectedProjectNames(['pkg/moon.yml'], { pkg: '@kbn/pkg' })).toEqual([
      '@kbn/pkg',
    ]);
  });
});
