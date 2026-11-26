/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectMoonTestConfigs } from './test_config_selection';

describe('selectMoonTestConfigs', () => {
  const project = {
    sourceRoot: 'plugins/example',
    configs: ['plugins/example/jest.config.js', 'plugins/example/server/jest.config.js'],
  };
  const scoutProject = {
    sourceRoot: 'plugins/example',
    configs: [
      'plugins/example/test/scout/api/playwright.config.ts',
      'plugins/example/test/scout/api/fips.playwright.config.ts',
      'plugins/example/test/scout/ui/parallel.playwright.config.ts',
    ],
  };

  it('selects every Jest config in an affected project for a changed test', () => {
    expect(
      selectMoonTestConfigs([project], ['plugins/example/server/example.test.ts'], 'jest-unit')
    ).toEqual(project.configs);
    expect(
      selectMoonTestConfigs(
        [project],
        ['plugins/example/server/example.test.ts'],
        'jest-integration'
      )
    ).toEqual(project.configs);
  });

  it('selects all configs for shared source and downstream changes', () => {
    expect(
      selectMoonTestConfigs([project], ['plugins/example/server/index.ts'], 'jest-unit')
    ).toEqual(project.configs);
    expect(selectMoonTestConfigs([project], ['packages/dependency/index.ts'], 'jest-unit')).toEqual(
      project.configs
    );
    expect(
      selectMoonTestConfigs([project], ['plugins/example/jest.config.js'], 'jest-unit')
    ).toEqual(project.configs);
    expect(
      selectMoonTestConfigs(
        [project],
        ['plugins/example/server/example.test.ts', 'packages/dependency/index.ts'],
        'jest-unit'
      )
    ).toEqual(project.configs);
  });

  it('selects each Scout mode that owns a changed spec', () => {
    expect(
      selectMoonTestConfigs(
        [scoutProject],
        ['plugins/example/test/scout/api/tests/example.spec.ts'],
        'scout'
      )
    ).toEqual(scoutProject.configs.slice(0, 2).reverse());
  });

  it('keeps all Scout configs when a local spec and upstream source change together', () => {
    expect(
      selectMoonTestConfigs(
        [scoutProject],
        ['plugins/example/test/scout/api/tests/example.spec.ts', 'packages/dependency/index.ts'],
        'scout'
      )
    ).toEqual([...scoutProject.configs].sort());
  });

  it('keeps all Scout configs when a local spec and shared runner change together', () => {
    expect(
      selectMoonTestConfigs(
        [scoutProject],
        ['plugins/example/test/scout/api/tests/example.spec.ts', 'scripts/scout.js'],
        'scout'
      )
    ).toEqual([...scoutProject.configs].sort());
  });

  it('still narrows independent Scout specs in separate projects', () => {
    expect(
      selectMoonTestConfigs(
        [scoutProject],
        [
          'plugins/example/test/scout/api/tests/example.spec.ts',
          'plugins/other/test/scout/ui/tests/other.spec.ts',
        ],
        'scout'
      )
    ).toEqual(scoutProject.configs.slice(0, 2).reverse());
  });
});
