/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getScoutCiConfigModuleFromPath,
  upsertEnabledModuleInScoutCiConfigYml,
} from './scout_ci_config';

describe('scout_ci_config helpers', () => {
  describe('getScoutCiConfigModuleFromPath', () => {
    it.each([
      ['x-pack/platform/plugins/shared/maps', { kind: 'plugins', name: 'maps' }],
      [
        'src/platform/plugins/private/vis_types/timelion',
        { kind: 'plugins', name: 'vis_types/timelion' },
      ],
      [
        'src/platform/packages/private/kbn-streamlang-tests',
        { kind: 'packages', name: 'kbn-streamlang-tests' },
      ],
      ['x-pack\\platform\\plugins\\shared\\maps', { kind: 'plugins', name: 'maps' }],
    ])('derives module from path: %s', (path, expected) => {
      expect(getScoutCiConfigModuleFromPath(path)).toEqual(expected);
    });
  });

  describe('upsertEnabledModuleInScoutCiConfigYml', () => {
    const baseYml = `plugins:
  enabled:
    - apm
    - maps
  disabled:
    - discover_enhanced

packages:
  enabled:
    - kbn-streamlang-tests
  disabled:

excluded_configs:
  - x-pack/some/path/ui/playwright.config.ts
`;

    it('adds a new plugin to enabled and sorts the enabled list', () => {
      const result = upsertEnabledModuleInScoutCiConfigYml(baseYml, {
        kind: 'plugins',
        name: 'lens',
      });

      expect(result).toMatchObject({ didChange: true, wasAlreadyEnabled: false });
      expect(result.updatedYml).toContain(`plugins:
  enabled:
    - apm
    - lens
    - maps
`);
    });

    it('does not change the file when the module is already enabled', () => {
      const result = upsertEnabledModuleInScoutCiConfigYml(baseYml, {
        kind: 'plugins',
        name: 'maps',
      });

      expect(result).toMatchObject({ didChange: false, wasAlreadyEnabled: true });
      expect(result.updatedYml).toBe(baseYml);
    });

    it('moves a module from disabled to enabled', () => {
      const yml = `plugins:
  enabled:
    - apm
  disabled:
    - lens

packages:
  enabled:
  disabled:
`;

      const result = upsertEnabledModuleInScoutCiConfigYml(yml, { kind: 'plugins', name: 'lens' });
      expect(result).toMatchObject({ didChange: true, movedFromDisabled: true });
      expect(result.updatedYml).toContain(`plugins:
  enabled:
    - apm
    - lens
  disabled:
`);
    });

    it('adds a package under packages.enabled (without touching plugins)', () => {
      const result = upsertEnabledModuleInScoutCiConfigYml(baseYml, {
        kind: 'packages',
        name: 'kbn-scout-release-testing',
      });

      expect(result).toMatchObject({ didChange: true });
      expect(result.updatedYml).toContain(`packages:
  enabled:
    - kbn-scout-release-testing
    - kbn-streamlang-tests
`);
      expect(result.updatedYml).toContain(`plugins:
  enabled:
    - apm
    - maps
`);
    });

    it('adds a nested module and sorts it correctly', () => {
      const yml = `plugins:
  enabled:
    - apm
    - maps
  disabled:

packages:
  enabled:
  disabled:
`;

      const result = upsertEnabledModuleInScoutCiConfigYml(yml, {
        kind: 'plugins',
        name: 'vis_types/timelion',
      });

      expect(result).toMatchObject({ didChange: true, wasAlreadyEnabled: false });
      expect(result.updatedYml).toContain(`plugins:
  enabled:
    - apm
    - maps
    - vis_types/timelion
  disabled:
`);
    });

    it('does not duplicate a nested module that is already enabled', () => {
      const yml = `plugins:
  enabled:
    - apm
    - vis_types/timelion
  disabled:

packages:
  enabled:
  disabled:
`;

      const result = upsertEnabledModuleInScoutCiConfigYml(yml, {
        kind: 'plugins',
        name: 'vis_types/timelion',
      });

      expect(result).toMatchObject({ didChange: false, wasAlreadyEnabled: true });
      expect(result.updatedYml).toBe(yml);
    });
  });
});
