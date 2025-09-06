/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FileSelector, type FileSelectorOptions } from './file_selector';
import {
  OutputFormatter,
  type OutputFormatterOptions,
  type ValidationResult,
  type ValidationError,
} from './output_formatter';
import { GitDiffAnalyzer, type DiffAnalysisOptions } from './git_diff_analyzer';
import {
  runBaseValidation,
  type BaseValidationOptions,
  type BaseValidationFileResult,
} from './base_validation';

export interface EnhancedValidationOptions {
  file?: FileSelectorOptions;
  output?: OutputFormatterOptions;
  git?: DiffAnalysisOptions;
  incremental?: boolean;
  force?: boolean;
  base?: Omit<BaseValidationOptions, 'customFiles' | 'useLogging'>;
}

export interface EnhancedValidationResult {
  success: boolean;
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    totalErrors: number;
  };
  output: string;
  exitCode: number;
  gitAnalysis?: {
    hasOasChanges: boolean;
    affectedPaths: string[];
    shouldRunValidation: boolean;
  };
}

/**
 * Runs enhanced OpenAPI Specification (OAS) validation with advanced features.
 *
 * This function provides advanced validation capabilities including structured JSON output,
 * incremental validation based on git changes, GitHub comment formatting for PR automation,
 * and advanced caching for improved performance. It's designed for CI/CD integration and
 * development workflow optimization.
 *
 * @param options - Enhanced validation configuration options
 * @param options.file - File selection and filtering options
 * @param options.output - Output formatting options (cli, json, github-comment)
 * @param options.git - Git diff analysis configuration for incremental validation
 * @param options.incremental - Enable incremental validation based on git changes
 * @param options.force - Force validation even if no changes detected in incremental mode
 * @param options.base - Base validation options (excluding custom files and logging)
 * @returns Promise resolving to enhanced validation results with structured output
 *
 * @example
 * ```typescript
 * import { runEnhancedValidation } from './enhanced_validation';
 *
 * // Basic enhanced validation with CLI output
 * const result = await runEnhancedValidation({
 *   output: { format: 'cli' }
 * });
 * log.write(result.output); // Use log.write for formatted output
 *
 * // Incremental validation for development workflow
 * const incrementalResult = await runEnhancedValidation({
 *   incremental: true,
 *   output: { format: 'cli' },
 *   base: { only: 'serverless' }
 * });
 *
 * // CI/CD integration with JSON output
 * const ciResult = await runEnhancedValidation({
 *   output: { format: 'json' },
 *   file: { includePaths: ['/api/fleet'] }
 * });
 * const jsonOutput = JSON.parse(ciResult.output);
 *
 * // GitHub PR automation
 * const prResult = await runEnhancedValidation({
 *   output: { format: 'github-comment' },
 *   incremental: true,
 *   force: false
 * });
 * // Use prResult.output as GitHub comment body
 * ```
 *
 * @public
 */
export async function runEnhancedValidation(
  options: EnhancedValidationOptions = {}
): Promise<EnhancedValidationResult> {
  const fileSelector = new FileSelector();
  const outputFormatter = new OutputFormatter();
  const gitAnalyzer = new GitDiffAnalyzer();

  let shouldValidate = true;
  let gitAnalysis;

  if (options.incremental && gitAnalyzer.isGitRepository()) {
    gitAnalysis = gitAnalyzer.analyzeDiff(options.git);
    shouldValidate = options.force || gitAnalysis.shouldRunValidation;

    if (gitAnalysis.affectedPaths.length > 0 && !options.file?.includePaths) {
      options.file = {
        ...options.file,
        includePaths: gitAnalysis.affectedPaths,
      };
    }
  }

  if (!shouldValidate) {
    return {
      success: true,
      summary: {
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0,
        totalErrors: 0,
      },
      output: 'No OAS-related changes detected. Skipping validation.',
      exitCode: 0,
      gitAnalysis,
    };
  }

  const filesToValidate = fileSelector.getFilesToValidate(options.file);

  if (filesToValidate.length === 0) {
    return {
      success: true,
      summary: {
        totalFiles: 0,
        validFiles: 0,
        invalidFiles: 0,
        totalErrors: 0,
      },
      output: 'No OAS files found to validate.',
      exitCode: 0,
      gitAnalysis,
    };
  }

  const baseValidationOptions: BaseValidationOptions = {
    ...options.base,
    only: options.file?.only,
    paths: options.file?.includePaths,
    customFiles: filesToValidate.map((f) => f.path),
    useLogging: false,
  };

  const baseResult = await runBaseValidation(baseValidationOptions);

  const results: ValidationResult[] = baseResult.results.map(
    (baseFileResult: BaseValidationFileResult) => {
      const filteredErrors = baseFileResult.errors.filter((error) =>
        fileSelector.shouldIncludePath(error.instancePath, options.file)
      );

      const enhancedVariant: 'traditional' | 'serverless' =
        baseFileResult.variant === 'custom' ? 'traditional' : baseFileResult.variant;

      const enhancedErrors: ValidationError[] = filteredErrors.map((error) => ({
        instancePath: error.instancePath,
        message: error.message,
        filePath: baseFileResult.filePath,
        variant: enhancedVariant,
      }));

      return {
        valid: baseFileResult.valid && filteredErrors.length === 0,
        filePath: baseFileResult.filePath,
        variant: enhancedVariant,
        errors: enhancedErrors,
        errorCount: filteredErrors.length,
      };
    }
  );

  const summary = outputFormatter.createSummary(results);
  const formattedOutput = outputFormatter.format(summary, options.output);

  const success = summary.invalidFiles === 0;
  const exitCode = success ? 0 : 1;

  return {
    success,
    summary: {
      totalFiles: summary.totalFiles,
      validFiles: summary.validFiles,
      invalidFiles: summary.invalidFiles,
      totalErrors: summary.totalErrors,
    },
    output: formattedOutput,
    exitCode,
    gitAnalysis,
  };
}

export { FileSelector, OutputFormatter, GitDiffAnalyzer };
export type {
  FileSelectorOptions,
  OutputFormatterOptions,
  DiffAnalysisOptions,
  ValidationResult,
  ValidationError,
};
