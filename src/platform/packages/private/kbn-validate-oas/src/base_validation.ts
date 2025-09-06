/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import Fs from 'node:fs';
import chalk from 'chalk';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { validationCache, createPerformanceCache } from './validation_cache';

export interface BaseValidationOptions {
  /** Validate only specific offering: 'traditional', 'serverless', or undefined for both */
  only?: 'traditional' | 'serverless';
  /** Array of path prefixes to filter validation errors */
  paths?: string[];
  /** Custom file paths to validate instead of default Kibana OAS files */
  customFiles?: string[];
  /** Whether to use console logging (default: true) */
  useLogging?: boolean;
  /** Custom logger functions for output control (legacy interface) */
  logger?: {
    log: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
  /** ToolingLog instance for consistent Kibana dev tooling logging (preferred) */
  toolingLog?: ToolingLog;
  /** Cache configuration options */
  cache?: {
    enabled?: boolean;
    usePerformanceCache?: boolean;
    warmCache?: boolean;
  };
}

export interface BaseValidationError {
  instancePath: string;
  message: string;
}

export interface BaseValidationFileResult {
  filePath: string;
  variant: 'traditional' | 'serverless' | 'custom';
  valid: boolean;
  errors: BaseValidationError[];
  errorCount: number;
}

export interface BaseValidationResult {
  success: boolean;
  results: BaseValidationFileResult[];
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
}

/**
 * Runs basic OpenAPI Specification (OAS) validation for Kibana API documentation.
 *
 * This function validates OAS YAML files using enhanced CLI features while maintaining
 * compatibility with legacy validation workflows. It supports filtering by offering type,
 * path-based error filtering, and performance optimizations through caching.
 *
 * @param options - Configuration options for validation
 * @param options.only - Validate only specific offering: 'traditional', 'serverless', or undefined for both
 * @param options.paths - Array of path prefixes to filter validation errors (e.g., ['/api/fleet'])
 * @param options.customFiles - Custom file paths to validate instead of default Kibana OAS files
 * @param options.useLogging - Whether to use console logging (default: true)
 * @param options.logger - Custom logger functions for output control (legacy interface)
 * @param options.toolingLog - ToolingLog instance for consistent Kibana dev tooling logging (preferred)
 * @param options.cache - Cache configuration for performance optimization
 * @returns Promise resolving to validation results with success status and detailed file results
 *
 * @example
 * ```typescript
 * import { runBaseValidation } from './base_validation';
 *
 * // Basic validation of all OAS files
 * const result = await runBaseValidation();
 * log.info(`Validation ${result.success ? 'passed' : 'failed'}`);
 * log.info(`${result.validFiles}/${result.totalFiles} files valid`);
 *
 * // Validate only serverless offering with path filtering
 * const serverlessResult = await runBaseValidation({
 *   only: 'serverless',
 *   paths: ['/api/fleet', '/api/security'],
 * });
 *
 * // Custom validation with performance cache
 * const customResult = await runBaseValidation({
 *   customFiles: ['./my-spec.yaml'],
 *   cache: { usePerformanceCache: true, warmCache: true },
 *   logger: {
 *     log: (msg) => myLogger.info(msg),
 *     warn: (msg) => myLogger.warn(msg),
 *     error: (msg) => myLogger.error(msg),
 *   },
 * });
 *
 * // Validation with ToolingLog for consistent Kibana dev tooling (preferred)
 * import { ToolingLog } from '@kbn/tooling-log';
 * const toolingLog = new ToolingLog({ level: 'info', writeTo: process.stdout });
 * const toolingResult = await runBaseValidation({
 *   only: 'serverless',
 *   toolingLog,
 * });
 * ```
 *
 * @public
 */
export async function runBaseValidation(
  options: BaseValidationOptions = {}
): Promise<BaseValidationResult> {
  const {
    only,
    paths,
    customFiles,
    useLogging = true,
    logger,
    toolingLog,
    cache: cacheOptions = {},
  } = options;

  const {
    enabled: cacheEnabled = true,
    usePerformanceCache = false,
    warmCache = false,
  } = cacheOptions;

  // Prioritize ToolingLog when available, fallback to custom logger, then default logging
  const log = toolingLog
    ? {
        log: (msg: string) => toolingLog.info(msg),
        warn: (msg: string) => toolingLog.warning(msg),
        error: (msg: string) => toolingLog.error(msg),
      }
    : logger || {
        log: useLogging ? (msg: string) => process.stdout.write(msg + '\n') : () => {},
        warn: useLogging ? (msg: string) => process.stderr.write(msg + '\n') : () => {},
        error: useLogging ? (msg: string) => process.stderr.write(msg + '\n') : () => {},
      };

  // Validation helper for 'only' parameter
  if (only && only !== 'traditional' && only !== 'serverless') {
    const error = new Error('Invalid value for only option, must be "traditional" or "serverless"');
    log.error(error.message);
    throw error;
  }

  const cache = usePerformanceCache ? createPerformanceCache() : validationCache;
  cache.setEnabled(cacheEnabled);

  const kibanaYamlPath = Path.resolve(REPO_ROOT, './oas_docs/output/kibana.yaml');
  const kibanaServerlessYamlPath = Path.resolve(
    REPO_ROOT,
    './oas_docs/output/kibana.serverless.yaml'
  );

  const filesToValidate: Array<{
    path: string;
    variant: 'traditional' | 'serverless' | 'custom';
  }> = [];

  if (customFiles?.length) {
    customFiles.forEach((filePath: string) => {
      filesToValidate.push({ path: filePath, variant: 'custom' });
    });
  } else {
    if (only === 'traditional') {
      filesToValidate.push({ path: kibanaYamlPath, variant: 'traditional' });
    } else if (only === 'serverless') {
      filesToValidate.push({ path: kibanaServerlessYamlPath, variant: 'serverless' });
    } else {
      filesToValidate.push(
        { path: kibanaYamlPath, variant: 'traditional' },
        { path: kibanaServerlessYamlPath, variant: 'serverless' }
      );
    }
  }

  const validateFile = async (
    filePath: string,
    variant: 'traditional' | 'serverless' | 'custom'
  ): Promise<BaseValidationFileResult> => {
    log.log(`About to validate spec at ${chalk.underline(filePath)}`);

    let fileContent: string;
    try {
      fileContent = Fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      const fileResult: BaseValidationFileResult = {
        filePath,
        variant,
        valid: false,
        errors: [{ instancePath: '', message: `Failed to read file: ${error}` }],
        errorCount: 1,
      };

      log.warn(`    ${chalk.underline(filePath)} could not be read: ${error}`);
      return fileResult;
    }

    const { Validator } = await import('@seriousme/openapi-schema-validator');
    const validator = new Validator({ strict: false, allErrors: true });

    const validationResult = await validator.validate(fileContent);
    const errors: BaseValidationError[] = [];
    let errorCount = 0;

    if (!validationResult.valid) {
      log.warn(`    ${chalk.underline(filePath)} is NOT valid`);

      if (Array.isArray(validationResult.errors)) {
        const filteredErrors = validationResult.errors.filter(
          (error) =>
            error.params?.missingProperty !== '$ref' &&
            error.params?.passingSchemas !== null &&
            (paths?.length ? paths.some((path) => error.instancePath.startsWith(path)) : true)
        );

        for (const error of filteredErrors) {
          errors.push({
            instancePath: error.instancePath,
            message: error.message || 'Unknown validation error',
          });
          errorCount++;
        }

        if (errors.length > 0) {
          const errorMessage = errors
            .map(({ instancePath, message }) => `${chalk.gray(instancePath)}\n${message}`)
            .join('\n\n');

          log.warn('    Found the following issues\n\n' + errorMessage + '\n');
          log.warn(`    Found ${chalk.bold(errorCount)} errors in ${chalk.underline(filePath)}`);
        }
      } else if (typeof validationResult.errors === 'string') {
        errors.push({
          instancePath: '',
          message: validationResult.errors,
        });
        errorCount = 1;

        log.warn('    Found the following issues\n\n' + validationResult.errors + '\n');
        log.warn(`    Found ${chalk.bold(errorCount)} errors in ${chalk.underline(filePath)}`);
      }
    } else {
      log.log(`    ${chalk.underline(filePath)} is valid`);
    }

    return {
      filePath,
      variant,
      valid: validationResult.valid && errorCount === 0,
      errors,
      errorCount,
    };
  };

  if (warmCache && cacheEnabled) {
    const filePaths = filesToValidate.map((f) => f.path);
    await cache.warmCache(filePaths, async (filePath) => {
      const fileInfo = filesToValidate.find((f) => f.path === filePath);
      return validateFile(filePath, fileInfo!.variant);
    });
  }

  let results: BaseValidationFileResult[];

  if (cacheEnabled && filesToValidate.length > 1) {
    results = await cache.processFiles(
      filesToValidate.map((f) => f.path),
      async (filePath) => {
        const fileInfo = filesToValidate.find((f) => f.path === filePath);
        return validateFile(filePath, fileInfo!.variant);
      }
    );
  } else {
    results = [];
    for (const { path: yamlPath, variant } of filesToValidate) {
      let result: BaseValidationFileResult;

      if (cacheEnabled) {
        const cachedResult = cache.get(yamlPath);
        if (cachedResult) {
          result = cachedResult;
          log.log(`Using cached result for ${chalk.underline(yamlPath)}`);
        } else {
          result = await validateFile(yamlPath, variant);
          cache.set(yamlPath, result);
        }
      } else {
        result = await validateFile(yamlPath, variant);
      }

      results.push(result);
    }
  }

  log.log('Done');

  if (cacheEnabled && useLogging) {
    const stats = cache.getStats();
    log.log(
      `Cache stats: ${stats.hits} hits, ${stats.misses} misses, hit rate: ${(
        stats.hitRate * 100
      ).toFixed(1)}%`
    );
  }

  const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const validFiles = results.filter((r) => r.valid).length;
  const invalidFiles = results.filter((r) => !r.valid).length;
  const success = invalidFiles === 0;

  return {
    success,
    results,
    totalFiles: results.length,
    validFiles,
    invalidFiles,
    totalErrors,
  };
}
