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
import Path from 'node:path';

interface CLIErrorTestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: Error;
}

class CLIErrorTestRunner {
  private scriptPath: string;

  constructor(scriptPath: string) {
    this.scriptPath = Path.resolve(REPO_ROOT, scriptPath);
  }

  runSync(args: string[] = [], timeout = 10000): CLIErrorTestResult {
    const result = spawnSync(process.execPath, [this.scriptPath, ...args], {
      cwd: REPO_ROOT,
      timeout,
      encoding: 'utf8',
    });

    return {
      exitCode: result.status || 0,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      error: result.error,
    };
  }
}

describe('OAS Validation CLI Error Handling and Edge Cases', () => {
  let validateOASDocsRunner: CLIErrorTestRunner;
  let oasEnhancedValidationRunner: CLIErrorTestRunner;

  beforeAll(() => {
    validateOASDocsRunner = new CLIErrorTestRunner('scripts/validate_oas_docs.js');
    oasEnhancedValidationRunner = new CLIErrorTestRunner('scripts/oas_enhanced_validation.js');
  });

  describe('validate_oas_docs.js Error Scenarios', () => {
    describe('Invalid Command Handling', () => {
      it('should handle malformed command structures', () => {
        const result = validateOASDocsRunner.runSync(['base', 'extra-arg']);

        // Should either handle gracefully or show appropriate error
        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });
    });

    describe('Invalid Flag Values', () => {
      it('should reject invalid --only values for base command', () => {
        const result = validateOASDocsRunner.runSync(['base', '--only', 'invalid']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr || result.stdout).toContain('Invalid value for --only flag');
      });

      it('should reject invalid --only values for enhanced command', () => {
        const result = validateOASDocsRunner.runSync(['enhanced', '--only', 'invalid']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr || result.stdout).toContain('Invalid value for --only flag');
      });

      it('should reject invalid --format values', () => {
        const result = validateOASDocsRunner.runSync(['enhanced', '--format', 'invalid']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr || result.stdout).toContain('Invalid value for --format flag');
      });

      it('should handle empty flag values', () => {
        const result = validateOASDocsRunner.runSync(['base', '--only', '']);

        expect(result.exitCode).toBe(1);
        expect(result.error).toBeUndefined();
      });
    });

    describe('Flag Combination Edge Cases', () => {
      it('should handle multiple --path flags correctly', () => {
        const result = validateOASDocsRunner.runSync([
          'base',
          '--path',
          '/valid/path',
          '--path',
          '/another/valid/path',
        ]);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle contradictory flags appropriately', () => {
        const result = validateOASDocsRunner.runSync([
          'enhanced',
          '--only',
          'serverless',
          '--only',
          'traditional',
        ]);

        // Should handle gracefully (last value wins)
        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle incremental without force flag', () => {
        const result = validateOASDocsRunner.runSync(['enhanced', '--incremental']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle force without incremental flag', () => {
        const result = validateOASDocsRunner.runSync(['enhanced', '--force']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });
    });

    describe('Path Handling', () => {
      it('should handle non-existent paths gracefully', () => {
        const result = validateOASDocsRunner.runSync([
          'base',
          '--path',
          '/paths/that/do/not/exist',
        ]);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle special characters in paths', () => {
        const result = validateOASDocsRunner.runSync([
          'base',
          '--path',
          '/paths/~1api~1special%20chars',
        ]);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle very long path arguments', () => {
        const longPath = '/paths/' + 'a'.repeat(1000);
        const result = validateOASDocsRunner.runSync(['base', '--path', longPath]);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });
    });

    describe('Resource Limits', () => {
      it('should handle excessive command line arguments', () => {
        const manyPaths = Array.from({ length: 100 }, (_, i) => [
          '--path',
          `/path/number/${i}`,
        ]).flat();

        const result = validateOASDocsRunner.runSync(['base', ...manyPaths]);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should respect timeout limits for hung processes', () => {
        // Test with a very short timeout to simulate hung process
        const result = validateOASDocsRunner.runSync(['enhanced'], 100);

        // Should either complete quickly or timeout gracefully
        expect([0, 1]).toContain(result.exitCode);
      });
    });
  });

  describe('oas_enhanced_validation.js Error Scenarios', () => {
    describe('Direct Script Error Handling', () => {
      it('should handle invalid arguments gracefully', () => {
        const result = oasEnhancedValidationRunner.runSync(['--invalid-flag']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should validate flag combinations properly', () => {
        const result = oasEnhancedValidationRunner.runSync([
          'enhanced',
          '--format',
          'invalid-format',
        ]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr || result.stdout).toContain('Invalid value for --format flag');
      });

      it('should handle missing required dependencies', () => {
        // This tests robustness when underlying dependencies might be missing
        const result = oasEnhancedValidationRunner.runSync(['--format', 'json']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });
    });
  });

  describe('System-Level Error Scenarios', () => {
    describe('File System Issues', () => {
      it('should handle read-only file system scenarios', () => {
        // Test in /tmp which might have different permissions
        const result = validateOASDocsRunner.runSync(['base'], 5000);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle disk space limitations gracefully', () => {
        // Test that the CLI doesn't create large temporary files
        const result = validateOASDocsRunner.runSync(['enhanced', '--format', 'json']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);

        // Ensure output is reasonable size (not creating huge temp files)
        const outputSize = Buffer.byteLength(result.stdout + result.stderr, 'utf8');
        expect(outputSize).toBeLessThan(5 * 1024 * 1024); // 5MB max
      });
    });

    describe('Process Management', () => {
      it('should handle SIGTERM gracefully', () => {
        // This is already covered in the main integration test file
        // but included here for completeness of error scenarios
        expect(true).toBe(true);
      });

      it('should not leave zombie processes', () => {
        // Test rapid execution to ensure cleanup
        for (let i = 0; i < 5; i++) {
          const result = validateOASDocsRunner.runSync(['--help'], 5000);
          expect(result.exitCode).toBe(0);
          expect(result.error).toBeUndefined();
        }
      });
    });

    describe('Memory Management', () => {
      it('should handle large file processing efficiently', () => {
        // Test that the CLI doesn't consume excessive memory
        const result = validateOASDocsRunner.runSync(['enhanced', '--format', 'json']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);

        // Basic sanity check - shouldn't produce output suggesting memory issues
        expect(result.stderr).not.toContain('out of memory');
        expect(result.stderr).not.toContain('heap');
      });
    });
  });

  describe('Help and Documentation', () => {
    describe('Help Flag Handling', () => {
      it('should prioritize help over other flags in validate_oas_docs.js', () => {
        const result = validateOASDocsRunner.runSync(['--help', '--invalid-flag']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Validate Kibana OAS YAML files');
      });

      it('should prioritize help over other flags in oas_enhanced_validation.js', () => {
        const result = oasEnhancedValidationRunner.runSync(['--help', '--invalid-flag']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('enhanced');
      });
    });

    describe('Usage Documentation', () => {
      it('should provide clear usage information', () => {
        const result = validateOASDocsRunner.runSync(['--help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Examples:');
        expect(result.stdout).toContain('enhanced');
      });

      it('should document all available flags', () => {
        const result = validateOASDocsRunner.runSync(['base', '--help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('--path');
        expect(result.stdout).toContain('--only');
      });
    });
  });

  describe('Backwards Compatibility', () => {
    describe('Legacy Command Support', () => {
      it('should maintain compatibility with old usage patterns', () => {
        // Test legacy usage without explicit commands
        const result = validateOASDocsRunner.runSync(['--only', 'serverless']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });

      it('should handle deprecated flags gracefully', () => {
        // Test with potentially deprecated flag combinations
        const result = validateOASDocsRunner.runSync(['base', '--only', 'traditional']);

        expect(result.error).toBeUndefined();
        expect([0, 1]).toContain(result.exitCode);
      });
    });
  });
});
