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
import { REPO_ROOT } from '@kbn/repo-info';

export interface FileSelectorOptions {
  only?: 'traditional' | 'serverless';
  includePaths?: string[];
  excludePaths?: string[];
}

export interface FileInfo {
  path: string;
  variant: 'traditional' | 'serverless';
  exists: boolean;
}

/**
 * Handles file selection and filtering for OpenAPI Specification (OAS) validation.
 *
 * This class provides intelligent file selection capabilities for OAS validation,
 * supporting filtering by offering type (traditional/serverless), path inclusion/exclusion,
 * and automatic detection of available specification files.
 *
 * @example
 * ```typescript
 * import { FileSelector } from './file_selector';
 *
 * const selector = new FileSelector();
 *
 * // Get all available files
 * const allFiles = selector.getFilesToValidate();
 *
 * // Get only serverless files
 * const serverlessFiles = selector.getFilesToValidate({
 *   only: 'serverless'
 * });
 *
 * // Get files with path filtering
 * const filteredFiles = selector.getFilesToValidate({
 *   includePaths: ['/api/fleet'],
 *   excludePaths: ['/internal']
 * });
 * ```
 *
 * @public
 */
export class FileSelector {
  private readonly kibanaYamlPath: string;
  private readonly kibanaServerlessYamlPath: string;

  constructor() {
    this.kibanaYamlPath = Path.resolve(REPO_ROOT, './oas_docs/output/kibana.yaml');
    this.kibanaServerlessYamlPath = Path.resolve(
      REPO_ROOT,
      './oas_docs/output/kibana.serverless.yaml'
    );
  }

  /**
   * Gets the list of OAS files to validate based on the provided options.
   *
   * This method intelligently selects which OpenAPI specification files should be validated
   * based on the offering type filter and automatically checks for file existence.
   *
   * @param options - File selection configuration options
   * @param options.only - Validate only specific offering: 'traditional', 'serverless', or undefined for both
   * @param options.includePaths - Array of path prefixes to include (currently for future use)
   * @param options.excludePaths - Array of path prefixes to exclude (currently for future use)
   * @returns Array of FileInfo objects with path, variant, and existence information
   *
   * @example
   * ```typescript
   * const selector = new FileSelector();
   *
   * // Validate all available offerings
   * const allFiles = selector.getFilesToValidate();
   * // Returns: [{ path: 'kibana.yaml', variant: 'traditional', exists: true },
   * //          { path: 'kibana.serverless.yaml', variant: 'serverless', exists: true }]
   *
   * // Validate only traditional offering
   * const traditionalFiles = selector.getFilesToValidate({ only: 'traditional' });
   * // Returns: [{ path: 'kibana.yaml', variant: 'traditional', exists: true }]
   *
   * // Check for missing files
   * const files = selector.getFilesToValidate();
   * const missingFiles = files.filter(file => !file.exists);
   * if (missingFiles.length > 0) {
   *   console.log('Missing specification files:', missingFiles);
   * }
   * ```
   */
  getFilesToValidate(options: FileSelectorOptions = {}): FileInfo[] {
    const files: FileInfo[] = [];

    if (options.only === 'traditional') {
      files.push(this.getFileInfo(this.kibanaYamlPath, 'traditional'));
    } else if (options.only === 'serverless') {
      files.push(this.getFileInfo(this.kibanaServerlessYamlPath, 'serverless'));
    } else {
      files.push(
        this.getFileInfo(this.kibanaYamlPath, 'traditional'),
        this.getFileInfo(this.kibanaServerlessYamlPath, 'serverless')
      );
    }

    return files.filter((file) => file.exists);
  }

  /**
   * Check if a path should be included based on path filters
   */
  shouldIncludePath(instancePath: string, options: FileSelectorOptions = {}): boolean {
    if (options.includePaths?.length) {
      const matches = options.includePaths.some((path) => instancePath.startsWith(path));
      if (!matches) return false;
    }

    if (options.excludePaths?.length) {
      const matches = options.excludePaths.some((path) => instancePath.startsWith(path));
      if (matches) return false;
    }

    return true;
  }

  /**
   * Get file information for a given path
   */
  private getFileInfo(filePath: string, variant: 'traditional' | 'serverless'): FileInfo {
    return {
      path: filePath,
      variant,
      exists: Fs.existsSync(filePath),
    };
  }

  /**
   * Read file content as string
   */
  readFileContent(filePath: string): string {
    return Fs.readFileSync(filePath, 'utf-8');
  }
}
