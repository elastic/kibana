/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CliSupportedServerModes } from '../../../types';
import { detectCustomConfigDir, getConfigRootDir } from './detect_custom_config';

describe('detectCustomConfigDir', () => {
  it('should detect custom config directory from playwright config path', () => {
    const configPath = 'x-pack/solutions/security/test/scout_uiam_local/ui/playwright.config.ts';
    const result = detectCustomConfigDir(configPath);
    expect(result).toBe('uiam_local');
  });

  it('should detect custom config directory with different path structure', () => {
    const configPath =
      'x-pack/platform/plugins/private/plugin/test/scout_custom/api/playwright.config.ts';
    const result = detectCustomConfigDir(configPath);
    expect(result).toBe('custom');
  });

  it('should return null for regular scout directory', () => {
    const configPath = 'x-pack/solutions/security/test/scout/ui/playwright.config.ts';
    const result = detectCustomConfigDir(configPath);
    expect(result).toBeNull();
  });

  it('should return null for path without scout pattern', () => {
    const configPath = 'some/other/path/playwright.config.ts';
    const result = detectCustomConfigDir(configPath);
    expect(result).toBeNull();
  });

  it('should handle Windows paths', () => {
    const configPath =
      'x-pack\\solutions\\security\\test\\scout_uiam_local\\ui\\playwright.config.ts';
    const result = detectCustomConfigDir(configPath);
    expect(result).toBe('uiam_local');
  });
});

describe('getConfigRootDir', () => {
  it('should return default serverless root when playwright path does not contain custom config', () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const mode = 'serverless=es' as CliSupportedServerModes;
    const result = getConfigRootDir(defaultPlaywrightPath, mode);

    expect(result).toContain('default');
    expect(result).toContain('serverless');
    expect(result).not.toContain('custom');
  });

  it('should return default stateful root when playwright path does not contain custom config', () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const mode = 'stateful' as CliSupportedServerModes;
    const result = getConfigRootDir(defaultPlaywrightPath, mode);

    expect(result).toContain('default');
    expect(result).toContain('stateful');
    expect(result).not.toContain('custom');
  });

  it('should return default root when playwright path does not contain custom config', () => {
    const playwrightPath = 'x-pack/solutions/security/test/scout/ui/playwright.config.ts';
    const mode = 'serverless=es' as CliSupportedServerModes;
    const result = getConfigRootDir(playwrightPath, mode);

    expect(result).toContain('default');
    expect(result).toContain('serverless');
    expect(result).not.toContain('custom');
  });

  it('should return custom root when playwright path contains custom config for serverless', () => {
    const playwrightPath =
      'x-pack/solutions/security/test/scout_uiam_local/ui/playwright.config.ts';
    const mode = 'serverless=es' as CliSupportedServerModes;
    const result = getConfigRootDir(playwrightPath, mode);

    expect(result).toContain('custom');
    expect(result).toContain('uiam_local');
    expect(result).toContain('serverless');
    expect(result).not.toContain('default');
  });

  it('should return custom root when playwright path contains custom config for stateful', () => {
    const playwrightPath =
      'x-pack/solutions/security/test/scout_uiam_local/ui/playwright.config.ts';
    const mode = 'stateful' as CliSupportedServerModes;
    const result = getConfigRootDir(playwrightPath, mode);

    expect(result).toContain('custom');
    expect(result).toContain('uiam_local');
    expect(result).toContain('stateful');
    expect(result).not.toContain('default');
  });

  it('should return custom root when configDir is explicitly provided for serverless', () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const mode = 'serverless=es' as CliSupportedServerModes;
    const result = getConfigRootDir(defaultPlaywrightPath, mode, 'uiam_local');

    expect(result).toContain('custom');
    expect(result).toContain('uiam_local');
    expect(result).toContain('serverless');
    expect(result).not.toContain('default');
  });

  it('should return custom root when configDir is explicitly provided for stateful', () => {
    const defaultPlaywrightPath = 'default/scout/ui/playwright.config.ts';
    const mode = 'stateful' as CliSupportedServerModes;
    const result = getConfigRootDir(defaultPlaywrightPath, mode, 'uiam_local');

    expect(result).toContain('custom');
    expect(result).toContain('uiam_local');
    expect(result).toContain('stateful');
    expect(result).not.toContain('default');
  });

  it('should prioritize configDir over playwright path detection', () => {
    const playwrightPath = 'x-pack/solutions/security/test/scout_other/ui/playwright.config.ts';
    const mode = 'serverless=es' as CliSupportedServerModes;
    const result = getConfigRootDir(playwrightPath, mode, 'uiam_local');

    expect(result).toContain('custom');
    expect(result).toContain('uiam_local');
    expect(result).not.toContain('other');
    expect(result).toContain('serverless');
  });
});
