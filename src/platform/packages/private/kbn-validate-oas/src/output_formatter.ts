/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';

export interface ValidationError {
  instancePath: string;
  message: string;
  filePath: string;
  variant: 'traditional' | 'serverless';
}

export interface ValidationResult {
  valid: boolean;
  filePath: string;
  variant: 'traditional' | 'serverless';
  errors: ValidationError[];
  errorCount: number;
}

export interface ValidationSummary {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  results: ValidationResult[];
}

export interface OutputFormatterOptions {
  format?: 'cli' | 'json' | 'github-comment';
  includeSuccessful?: boolean;
  groupByFile?: boolean;
}

/**
 * Formats validation output for different contexts including CLI, GitHub comments, and JSON.
 *
 * This class provides flexible output formatting capabilities for OAS validation results,
 * supporting multiple output formats for different use cases such as development (CLI),
 * CI/CD integration (JSON), and GitHub PR automation (GitHub comments).
 *
 * @example
 * ```typescript
 * import { OutputFormatter } from './output_formatter';
 *
 * const formatter = new OutputFormatter();
 * const summary = {
 *   totalFiles: 2,
 *   validFiles: 1,
 *   invalidFiles: 1,
 *   totalErrors: 5,
 *   results: [...]
 * };
 *
 * // Format for CLI output
 * const cliOutput = formatter.format(summary, { format: 'cli' });
 *
 * // Format for CI/CD integration
 * const jsonOutput = formatter.format(summary, { format: 'json' });
 * const parsedResults = JSON.parse(jsonOutput);
 *
 * // Format for GitHub PR comments
 * const githubOutput = formatter.format(summary, { format: 'github-comment' });
 * ```
 *
 * @public
 */
export class OutputFormatter {
  /**
   * Formats validation results based on the specified output format.
   *
   * This method transforms validation results into the appropriate format for the target context,
   * providing rich formatting for CLI output, structured data for JSON, and markdown formatting
   * for GitHub comments.
   *
   * @param summary - Validation summary containing results and statistics
   * @param options - Formatting options
   * @param options.format - Output format: 'cli' (colored terminal), 'json' (structured data), or 'github-comment' (markdown)
   * @param options.includeSuccessful - Whether to include successful validations in output (default: false for most formats)
   * @param options.groupByFile - Whether to group errors by file (default: true for readable formats)
   * @returns Formatted output string ready for the target context
   *
   * @example
   * ```typescript
   * // CLI format with colors and user-friendly layout
   * const cliOutput = formatter.format(summary, {
   *   format: 'cli',
   *   includeSuccessful: true
   * });
   * console.log(cliOutput);
   *
   * // JSON format for programmatic consumption
   * const jsonOutput = formatter.format(summary, { format: 'json' });
   * const data = JSON.parse(jsonOutput);
   *
   * // GitHub comment format for PR automation
   * const prComment = formatter.format(summary, {
   *   format: 'github-comment',
   *   groupByFile: true
   * });
   * await github.issues.createComment({ body: prComment });
   * ```
   */
  format(summary: ValidationSummary, options: OutputFormatterOptions = {}): string {
    const { format = 'cli' } = options;

    switch (format) {
      case 'json':
        return this.formatAsJson(summary, options);
      case 'github-comment':
        return this.formatAsGitHubComment(summary, options);
      case 'cli':
      default:
        return this.formatAsCli(summary, options);
    }
  }

  /**
   * Format as CLI output (matches existing format)
   */
  private formatAsCli(summary: ValidationSummary, options: OutputFormatterOptions): string {
    const lines: string[] = [];

    for (const result of summary.results) {
      lines.push(`About to validate spec at ${chalk.underline(result.filePath)}`);

      if (result.valid) {
        if (options.includeSuccessful) {
          lines.push(`   │ ${chalk.green('✓')} ${chalk.underline(result.filePath)} is valid`);
        }
      } else {
        lines.push(`   │ ${chalk.yellow('warn')} ${chalk.underline(result.filePath)} is NOT valid`);
        lines.push(`   │ ${chalk.yellow('warn')} Found the following issues`);
        lines.push('   │');

        for (const error of result.errors) {
          lines.push(`   │      ${chalk.gray(error.instancePath)}`);
          lines.push(`   │      ${error.message}`);
          lines.push('   │');
        }

        lines.push(
          `   │ ${chalk.yellow('warn')} Found ${chalk.bold(
            result.errorCount
          )} errors in ${chalk.underline(result.filePath)}`
        );
      }
      lines.push('');
    }

    lines.push('Done');
    return lines.join('\n');
  }

  /**
   * Format as JSON output
   */
  private formatAsJson(summary: ValidationSummary, options: OutputFormatterOptions): string {
    const output = {
      summary: {
        totalFiles: summary.totalFiles,
        validFiles: summary.validFiles,
        invalidFiles: summary.invalidFiles,
        totalErrors: summary.totalErrors,
      },
      results: summary.results.map((result) => ({
        filePath: result.filePath,
        variant: result.variant,
        valid: result.valid,
        errorCount: result.errorCount,
        errors: result.errors.map((error) => ({
          path: error.instancePath,
          message: error.message,
        })),
      })),
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Format as GitHub comment markdown
   */
  private formatAsGitHubComment(
    summary: ValidationSummary,
    options: OutputFormatterOptions
  ): string {
    const lines: string[] = [];

    if (summary.invalidFiles === 0) {
      lines.push('## ✅ OpenAPI Specification Validation Passed');
      lines.push('');
      lines.push(`All ${summary.totalFiles} OpenAPI specification file(s) are valid.`);
      return lines.join('\n');
    }

    lines.push('## ❌ OpenAPI Specification Validation Issues Found');
    lines.push('');
    lines.push(
      `Found ${summary.totalErrors} validation error(s) across ${summary.invalidFiles} file(s).`
    );
    lines.push('');

    for (const result of summary.results) {
      if (!result.valid) {
        lines.push(
          `### ${result.variant === 'serverless' ? '☁️' : '🏢'} ${result.variant} variant`
        );
        lines.push('');
        lines.push(`**File:** \`${result.filePath}\``);
        lines.push(`**Errors:** ${result.errorCount}`);
        lines.push('');

        const errorsByPath = this.groupErrorsByPath(result.errors);

        for (const [path, errors] of Object.entries(errorsByPath)) {
          lines.push(`#### \`${path}\``);
          lines.push('');
          for (const error of errors) {
            lines.push(`- ${error.message}`);
          }
          lines.push('');
        }
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('**💡 Common fixes:**');
    lines.push('- Add missing `description` properties to response objects');
    lines.push('- Ensure all required properties are defined in schemas');
    lines.push(
      '- Validate OpenAPI 3.0 compliance with [OpenAPI specification](https://swagger.io/specification/)'
    );

    return lines.join('\n');
  }

  /**
   * Group errors by their base path for better organization
   */
  private groupErrorsByPath(errors: ValidationError[]): Record<string, ValidationError[]> {
    const grouped: Record<string, ValidationError[]> = {};

    for (const error of errors) {
      const pathMatch = error.instancePath.match(/^(\/paths\/[^\/]+(?:\/[^\/]+)*)/);
      const basePath = pathMatch ? pathMatch[1] : error.instancePath;

      if (!grouped[basePath]) {
        grouped[basePath] = [];
      }
      grouped[basePath].push(error);
    }

    return grouped;
  }

  /**
   * Create a validation summary from individual results
   */
  createSummary(results: ValidationResult[]): ValidationSummary {
    const validFiles = results.filter((r) => r.valid).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);

    return {
      totalFiles: results.length,
      validFiles,
      invalidFiles: results.length - validFiles,
      totalErrors,
      results,
    };
  }
}
