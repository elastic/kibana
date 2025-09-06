/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock the OpenAPI validator to avoid ES module issues in Jest
jest.mock('@seriousme/openapi-schema-validator', () => ({
  Validator: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockImplementation((content: string) => {
      // Simple mock logic: if content contains "invalid", return errors
      if (content.includes('invalid')) {
        return {
          valid: false,
          errors: [
            {
              instancePath: '/paths/test',
              message: 'Test validation error',
              params: { missingProperty: 'test' },
            },
          ],
        };
      }
      return {
        valid: true,
        errors: [],
      };
    }),
  })),
}));

import { FileSelector } from './file_selector';
import { OutputFormatter } from './output_formatter';
import { GitDiffAnalyzer } from './git_diff_analyzer';
import { runEnhancedValidation } from './enhanced_validation';

describe('@kbn/validate-oas enhanced functionality', () => {
  describe('FileSelector', () => {
    let fileSelector: FileSelector;

    beforeEach(() => {
      fileSelector = new FileSelector();
    });

    test('should select serverless files only', () => {
      const files = fileSelector.getFilesToValidate({ only: 'serverless' });
      expect(files).toHaveLength(1);
      expect(files[0].variant).toBe('serverless');
    });

    test('should select traditional files only', () => {
      const files = fileSelector.getFilesToValidate({ only: 'traditional' });
      expect(files).toHaveLength(1);
      expect(files[0].variant).toBe('traditional');
    });

    test('should include paths based on filter', () => {
      const shouldInclude = fileSelector.shouldIncludePath('/paths/~1api~1fleet~1agent_policies', {
        includePaths: ['/paths/~1api~1fleet'],
      });
      expect(shouldInclude).toBe(true);
    });

    test('should exclude paths based on filter', () => {
      const shouldInclude = fileSelector.shouldIncludePath('/paths/~1api~1fleet~1agent_policies', {
        excludePaths: ['/paths/~1api~1fleet'],
      });
      expect(shouldInclude).toBe(false);
    });
  });

  describe('OutputFormatter', () => {
    let outputFormatter: OutputFormatter;

    beforeEach(() => {
      outputFormatter = new OutputFormatter();
    });

    test('should create summary from results', () => {
      const results = [
        {
          valid: true,
          filePath: '/test1.yaml',
          variant: 'traditional' as const,
          errors: [],
          errorCount: 0,
        },
        {
          valid: false,
          filePath: '/test2.yaml',
          variant: 'serverless' as const,
          errors: [
            {
              instancePath: '/paths/test',
              message: 'test error',
              filePath: '/test2.yaml',
              variant: 'serverless' as const,
            },
          ],
          errorCount: 1,
        },
      ];

      const summary = outputFormatter.createSummary(results);
      expect(summary.totalFiles).toBe(2);
      expect(summary.validFiles).toBe(1);
      expect(summary.invalidFiles).toBe(1);
      expect(summary.totalErrors).toBe(1);
    });

    test('should format as JSON', () => {
      const summary = {
        totalFiles: 1,
        validFiles: 0,
        invalidFiles: 1,
        totalErrors: 1,
        results: [
          {
            valid: false,
            filePath: '/test.yaml',
            variant: 'serverless' as const,
            errors: [
              {
                instancePath: '/paths/test',
                message: 'test error',
                filePath: '/test.yaml',
                variant: 'serverless' as const,
              },
            ],
            errorCount: 1,
          },
        ],
      };

      const output = outputFormatter.format(summary, { format: 'json' });
      const parsed = JSON.parse(output);
      expect(parsed.summary.totalFiles).toBe(1);
      expect(parsed.results).toHaveLength(1);
    });
  });

  describe('GitDiffAnalyzer', () => {
    let gitAnalyzer: GitDiffAnalyzer;

    beforeEach(() => {
      gitAnalyzer = new GitDiffAnalyzer();
    });

    test('should detect git repository', () => {
      const isGitRepo = gitAnalyzer.isGitRepository();
      expect(typeof isGitRepo).toBe('boolean');
    });

    test('should get current branch', () => {
      const branch = gitAnalyzer.getCurrentBranch();
      expect(typeof branch).toBe('string');
    });

    test('should analyze diff without errors', () => {
      const analysis = gitAnalyzer.analyzeDiff({ baseBranch: 'main' });
      expect(analysis).toHaveProperty('hasOasChanges');
      expect(analysis).toHaveProperty('shouldRunValidation');
      expect(Array.isArray(analysis.oasFilesChanged)).toBe(true);
      expect(Array.isArray(analysis.affectedPaths)).toBe(true);
    });
  });

  describe('runEnhancedValidation', () => {
    test('should run basic validation', async () => {
      const result = await runEnhancedValidation({
        file: { only: 'serverless' },
        output: { format: 'json' },
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('exitCode');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.exitCode).toBe('number');
    });

    test('should handle incremental validation', async () => {
      const result = await runEnhancedValidation({
        incremental: true,
        git: { baseBranch: 'main' },
        output: { format: 'json' },
      });

      expect(result).toHaveProperty('gitAnalysis');
      if (result.gitAnalysis) {
        expect(result.gitAnalysis).toHaveProperty('hasOasChanges');
        expect(result.gitAnalysis).toHaveProperty('shouldRunValidation');
      }
    });
  });
});
