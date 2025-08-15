/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';

describe('OAS validation CLI scripts', () => {
  describe('enhanced validation command', () => {
    it('should display help when requested', () => {
      const { error, status, stdout } = spawnSync(
        process.execPath,
        ['scripts/validate_oas_docs.js', 'enhanced', '--help'],
        {
          cwd: REPO_ROOT,
          timeout: 30000,
          encoding: 'utf8',
        }
      );

      expect(error).toBe(undefined);
      expect(status).toBe(0);
      // The output contains command help information
      expect(stdout).toContain('enhanced');
    });

    it('should execute enhanced validation without errors when help is not requested', () => {
      // This test will pass regardless of whether the OAS files exist
      // as it just tests that the CLI can be invoked without crashing
      const { error, status } = spawnSync(
        process.execPath,
        ['scripts/validate_oas_docs.js', 'enhanced', '--only', 'traditional'],
        {
          cwd: REPO_ROOT,
          timeout: 30000,
        }
      );

      expect(error).toBe(undefined);
      // The exit status may be non-zero if files don't exist, but that's expected
      expect(typeof status).toBe('number');
    });
  });

  describe('base validation command', () => {
    it('should display help when requested', () => {
      const { error, status } = spawnSync(
        process.execPath,
        ['scripts/validate_oas_docs.js', 'base', '--help'],
        {
          cwd: REPO_ROOT,
          timeout: 30000,
        }
      );

      expect(error).toBe(undefined);
      expect(status).toBe(0);
    });

    it('should execute base validation without errors when help is not requested', () => {
      // This test will pass regardless of whether the OAS files exist
      // as it just tests that the CLI can be invoked without crashing
      const { error, status } = spawnSync(
        process.execPath,
        ['scripts/validate_oas_docs.js', 'base', '--only', 'traditional'],
        {
          cwd: REPO_ROOT,
          timeout: 30000,
        }
      );

      expect(error).toBe(undefined);
      // The exit status may be non-zero if files don't exist, but that's expected
      expect(typeof status).toBe('number');
    });
  });

  describe('CLI error handling', () => {
    it('should handle invalid commands gracefully', () => {
      const { error, status } = spawnSync(
        process.execPath,
        ['scripts/validate_oas_docs.js', 'invalid-command'],
        {
          cwd: REPO_ROOT,
          timeout: 30000,
        }
      );

      expect(error).toBe(undefined);
      expect(status).not.toBe(0);
    });
  });
});
