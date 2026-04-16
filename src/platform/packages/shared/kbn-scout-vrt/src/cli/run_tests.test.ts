/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import inquirer from 'inquirer';
import { REPO_ROOT } from '@kbn/repo-info';
import {
  buildScoutArgsForVisualRun,
  discoverAllVisualRunSelections,
  discoverSelectedVisualRunSelections,
  discoverVisualTestFilesForConfig,
  formatVisualRunSelectionsList,
  hasVisualTestDependency,
  parseVisualRunTestsArgs,
  promptForVisualRunSelection,
} from './run_tests';

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn(),
  },
}));

const promptMock = jest.mocked(inquirer.prompt);

describe('parseVisualRunTestsArgs', () => {
  it('allows bare runs so the CLI can list VRT-enabled configs', () => {
    expect(
      parseVisualRunTestsArgs(['--arch', 'stateful', '--domain=classic', '--update-baselines'])
    ).toEqual({
      configPath: undefined,
      forwardedArgs: ['--arch', 'stateful', '--domain=classic'],
      helpRequested: false,
      testFilesList: undefined,
      updateBaselines: true,
    });
  });

  it('parses config-based runs', () => {
    expect(
      parseVisualRunTestsArgs([
        '--arch',
        'stateful',
        '--domain=classic',
        '--config',
        'src/plugin/test/scout/ui/playwright.config.ts',
      ])
    ).toEqual({
      configPath: 'src/plugin/test/scout/ui/playwright.config.ts',
      forwardedArgs: ['--arch', 'stateful', '--domain=classic'],
      helpRequested: false,
      testFilesList: undefined,
      updateBaselines: false,
    });
  });

  it('parses testFiles-based runs', () => {
    expect(
      parseVisualRunTestsArgs([
        '--location',
        'cloud',
        '--arch',
        'stateful',
        '--domain',
        'classic',
        '--testFiles=src/plugin/test/scout/ui/tests/example.spec.ts',
      ])
    ).toEqual({
      configPath: undefined,
      forwardedArgs: ['--location', 'cloud', '--arch', 'stateful', '--domain', 'classic'],
      helpRequested: false,
      testFilesList: 'src/plugin/test/scout/ui/tests/example.spec.ts',
      updateBaselines: false,
    });
  });

  it('rejects combining config and testFiles', () => {
    expect(() =>
      parseVisualRunTestsArgs([
        '--config',
        'src/plugin/test/scout/ui/playwright.config.ts',
        '--testFiles',
        'src/plugin/test/scout/ui/tests/example.spec.ts',
      ])
    ).toThrow(`Cannot use both '--config' and '--testFiles' at the same time`);
  });
});

describe('hasVisualTestDependency', () => {
  it('detects a spec that reaches @kbn/scout-vrt through local fixtures', async () => {
    const advancedSettingsVisualSpec = path.resolve(
      REPO_ROOT,
      'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts'
    );

    await expect(hasVisualTestDependency(advancedSettingsVisualSpec)).resolves.toBe(true);
  });

  it('does not flag ordinary Scout specs as visual', async () => {
    const globalSearchNonVisualSpec = path.resolve(
      REPO_ROOT,
      'x-pack/platform/plugins/shared/global_search/test/scout/ui/tests/global_search_providers.spec.ts'
    );

    await expect(hasVisualTestDependency(globalSearchNonVisualSpec)).resolves.toBe(false);
  });
});

describe('discoverVisualTestFilesForConfig', () => {
  it('discovers visual suites by scanning the config testDir and following fixture imports', async () => {
    await expect(
      discoverVisualTestFilesForConfig(
        'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts'
      )
    ).resolves.toEqual([
      'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
      'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
    ]);
  }, 30000);
});

describe('buildScoutArgsForVisualRun', () => {
  it('replaces the original selection with filtered visual test files', () => {
    const parsedArgs = parseVisualRunTestsArgs([
      '--arch',
      'stateful',
      '--domain',
      'classic',
      '--config',
      'src/plugin/test/scout/ui/playwright.config.ts',
    ]);

    expect(
      buildScoutArgsForVisualRun(parsedArgs, [
        'src/plugin/test/scout/ui/tests/one.spec.ts',
        'src/plugin/test/scout/ui/tests/two.spec.ts',
      ])
    ).toEqual([
      '--arch',
      'stateful',
      '--domain',
      'classic',
      '--testFiles',
      'src/plugin/test/scout/ui/tests/one.spec.ts,src/plugin/test/scout/ui/tests/two.spec.ts',
    ]);
  });
});

describe('discoverVisualRunSelections', () => {
  it('discovers visual suites from config testDir', async () => {
    await expect(
      discoverSelectedVisualRunSelections(
        parseVisualRunTestsArgs([
          '--arch',
          'stateful',
          '--domain',
          'classic',
          '--config',
          'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
        ])
      )
    ).resolves.toEqual([
      {
        configPath:
          'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
        visualTestFiles: [
          'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
          'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
        ],
      },
    ]);
  });

  it('filters explicit testFiles selections by visual dependency', async () => {
    await expect(
      discoverSelectedVisualRunSelections(
        parseVisualRunTestsArgs([
          '--arch',
          'stateful',
          '--domain',
          'classic',
          '--testFiles',
          'x-pack/platform/plugins/shared/global_search/test/scout/ui/tests',
        ])
      )
    ).resolves.toEqual([
      {
        configPath:
          'x-pack/platform/plugins/shared/global_search/test/scout/ui/playwright.config.ts',
        visualTestFiles: [
          'x-pack/platform/plugins/shared/global_search/test/scout/ui/tests/global_search_bar.spec.ts',
        ],
      },
    ]);
  });
});

describe('discoverAllVisualRunSelections', () => {
  it('finds repo-wide visual configs without a hand-maintained config inventory', async () => {
    await expect(discoverAllVisualRunSelections()).resolves.toEqual(
      expect.arrayContaining([
        {
          configPath:
            'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          visualTestFiles: [
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
          ],
        },
        {
          configPath:
            'x-pack/platform/plugins/shared/global_search/test/scout/ui/playwright.config.ts',
          visualTestFiles: [
            'x-pack/platform/plugins/shared/global_search/test/scout/ui/tests/global_search_bar.spec.ts',
          ],
        },
      ])
    );
  }, 30000);
});

describe('formatVisualRunSelectionsList', () => {
  it('formats a helpful config inventory for bare scout_vrt runs', () => {
    expect(
      formatVisualRunSelectionsList([
        {
          configPath:
            'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          visualTestFiles: [
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
          ],
        },
      ])
    ).toContain(
      '- src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts (2 visual specs)'
    );
  });
});

describe('promptForVisualRunSelection', () => {
  beforeEach(() => {
    promptMock.mockReset();
  });

  it('uses inquirer to select a config with keyboard navigation', async () => {
    promptMock.mockResolvedValue({
      selectedConfigPath:
        'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
    });

    await expect(
      promptForVisualRunSelection([
        {
          configPath:
            'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          visualTestFiles: [
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
          ],
        },
      ])
    ).resolves.toEqual({
      configPath:
        'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
      visualTestFiles: [
        'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
        'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_spaces.spec.ts',
      ],
    });

    expect(promptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'list',
        name: 'selectedConfigPath',
        message: 'Select a VRT-enabled Scout config to run:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('advanced_settings/test/scout/ui/playwright.config.ts'),
            value:
              'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          }),
          expect.objectContaining({
            name: 'Exit without running',
            value: '__exit__',
          }),
        ]),
      })
    );
  });

  it('returns undefined when the user exits the selector', async () => {
    promptMock.mockResolvedValue({
      selectedConfigPath: '__exit__',
    });

    await expect(
      promptForVisualRunSelection([
        {
          configPath:
            'src/platform/plugins/private/advanced_settings/test/scout/ui/playwright.config.ts',
          visualTestFiles: [
            'src/platform/plugins/private/advanced_settings/test/scout/ui/tests/advanced_settings_security.spec.ts',
          ],
        },
      ])
    ).resolves.toBeUndefined();
  });
});
