/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { glob } from 'glob';

/**
 * File Operations Tools
 *
 * Tools for writing generated code to files and managing file structure
 */

interface WriteFileOptions {
  path: string;
  content: string;
  createDirs?: boolean;
  overwrite?: boolean;
  workingDir?: string;
}

interface SuggestFileLocationOptions {
  fileType: 'test' | 'pageObject' | 'apiService' | 'fixture' | 'utility';
  name: string;
  scope?: 'platform' | 'security' | 'observability' | 'management';
  workingDir?: string;
}

interface FindExistingFilesOptions {
  pattern: string;
  fileType?: 'pageObject' | 'apiService' | 'test';
  workingDir?: string;
}

/**
 * Write file to disk
 */
export async function scoutWriteFile(params: WriteFileOptions) {
  try {
    const {
      path,
      content,
      createDirs = true,
      overwrite = false,
      workingDir = process.cwd(),
    } = params;

    // Resolve absolute path
    const absolutePath = resolve(workingDir, path);

    // Check if file exists
    if (existsSync(absolutePath) && !overwrite) {
      return {
        success: false,
        error: `File already exists: ${path}. Use overwrite: true to replace it.`,
        data: {
          path: absolutePath,
          exists: true,
        },
      };
    }

    // Create directories if needed
    if (createDirs) {
      const dir = dirname(absolutePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Write file
    writeFileSync(absolutePath, content, 'utf-8');

    return {
      success: true,
      data: {
        path: absolutePath,
        relativePath: path,
        size: content.length,
        created: !existsSync(absolutePath),
      },
      message: `✅ File written: ${path}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Read existing file
 */
export async function scoutReadFile(params: { path: string; workingDir?: string }) {
  try {
    const { path, workingDir = process.cwd() } = params;

    const absolutePath = resolve(workingDir, path);

    if (!existsSync(absolutePath)) {
      return {
        success: false,
        error: `File not found: ${path}`,
      };
    }

    const content = readFileSync(absolutePath, 'utf-8');

    return {
      success: true,
      data: {
        path: absolutePath,
        relativePath: path,
        content,
        size: content.length,
        lines: content.split('\n').length,
      },
      message: `Read ${content.length} bytes from ${path}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Suggest file location based on type and naming conventions
 */
export async function scoutSuggestFileLocation(params: SuggestFileLocationOptions) {
  try {
    const { fileType, name, scope = 'platform', workingDir = process.cwd() } = params;

    let suggestedPath = '';
    let alternatives: string[] = [];

    // Convert name to proper casing
    const snakeName = toSnakeCase(name);
    const pascalName = toPascalCase(name);

    switch (fileType) {
      case 'test':
        if (scope === 'security') {
          suggestedPath = `x-pack/solutions/security/plugins/security_solution/test/scout/ui/tests/${snakeName}.spec.ts`;
          alternatives = [
            `x-pack/test/scout/ui/tests/${snakeName}.spec.ts`,
            `test/scout/ui/tests/${snakeName}.spec.ts`,
          ];
        } else {
          suggestedPath = `x-pack/test/scout/ui/tests/${snakeName}.spec.ts`;
          alternatives = [
            `test/scout/ui/tests/${snakeName}.spec.ts`,
            `packages/kbn-scout/src/test/${snakeName}.spec.ts`,
          ];
        }
        break;

      case 'pageObject':
        if (scope === 'security') {
          suggestedPath = `x-pack/solutions/security/plugins/security_solution/test/scout/ui/page_objects/${snakeName}_page.ts`;
          alternatives = [
            `x-pack/test/scout/ui/page_objects/${snakeName}_page.ts`,
            `packages/kbn-scout-security/src/playwright/page_objects/${snakeName}_page.ts`,
          ];
        } else {
          suggestedPath = `x-pack/test/scout/ui/page_objects/${snakeName}_page.ts`;
          alternatives = [`packages/kbn-scout/src/playwright/page_objects/${snakeName}_page.ts`];
        }
        break;

      case 'apiService':
        if (scope === 'security') {
          suggestedPath = `x-pack/solutions/security/plugins/security_solution/test/scout/ui/fixtures/services/${snakeName}_service.ts`;
          alternatives = [
            `packages/kbn-scout-security/src/playwright/fixtures/services/${snakeName}_service.ts`,
          ];
        } else {
          suggestedPath = `packages/kbn-scout/src/playwright/fixtures/services/${snakeName}_service.ts`;
          alternatives = [`x-pack/test/scout/ui/fixtures/services/${snakeName}_service.ts`];
        }
        break;

      case 'fixture':
        suggestedPath = `packages/kbn-scout/src/playwright/fixtures/${snakeName}.ts`;
        alternatives = [`x-pack/test/scout/ui/fixtures/${snakeName}.ts`];
        break;

      case 'utility':
        suggestedPath = `packages/kbn-scout/src/utils/${snakeName}.ts`;
        alternatives = [`test/scout/utils/${snakeName}.ts`];
        break;
    }

    // Check which paths exist in the workspace
    const existingStructure = await detectExistingStructure(workingDir);

    return {
      success: true,
      data: {
        suggested: suggestedPath,
        alternatives,
        fullPath: resolve(workingDir, suggestedPath),
        exists: existsSync(resolve(workingDir, suggestedPath)),
        recommendations: getRecommendations(fileType, scope, existingStructure),
      },
      message: `Suggested location: ${suggestedPath}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find existing files (page objects, API services, etc.)
 */
export async function scoutFindExistingFiles(params: FindExistingFilesOptions) {
  try {
    const { pattern, fileType, workingDir = process.cwd() } = params;

    let searchPattern = pattern;

    // Add type-specific patterns
    if (fileType === 'pageObject') {
      searchPattern = `**/*${pattern}*page*.ts`;
    } else if (fileType === 'apiService') {
      searchPattern = `**/*${pattern}*service*.ts`;
    } else if (fileType === 'test') {
      searchPattern = `**/*${pattern}*.spec.ts`;
    }

    const files = await glob(searchPattern, {
      cwd: workingDir,
      ignore: ['**/node_modules/**', '**/build/**', '**/target/**', '**/dist/**'],
      absolute: false,
    });

    const results = files.map((file) => ({
      path: file,
      fullPath: resolve(workingDir, file),
      type: detectFileType(file),
    }));

    return {
      success: true,
      data: {
        files: results,
        count: results.length,
        pattern: searchPattern,
      },
      message: `Found ${results.length} files matching "${pattern}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Detect existing Scout structure in workspace
 */
async function detectExistingStructure(workingDir: string): Promise<{
  hasSecurityPlugin: boolean;
  hasScoutPackage: boolean;
  hasScoutSecurityPackage: boolean;
}> {
  return {
    hasSecurityPlugin: existsSync(
      join(workingDir, 'x-pack/solutions/security/plugins/security_solution/test/scout')
    ),
    hasScoutPackage: existsSync(join(workingDir, 'packages/kbn-scout')),
    hasScoutSecurityPackage: existsSync(join(workingDir, 'packages/kbn-scout-security')),
  };
}

/**
 * Get recommendations based on existing structure
 */
function getRecommendations(
  fileType: string,
  scope: string,
  structure: Awaited<ReturnType<typeof detectExistingStructure>>
): string[] {
  const recs: string[] = [];

  if (scope === 'security' && structure.hasSecurityPlugin) {
    recs.push('Use security_solution plugin directory for security-specific code');
  }

  if (structure.hasScoutSecurityPackage && fileType === 'pageObject') {
    recs.push('Consider adding to @kbn/scout-security package for reusability');
  }

  if (structure.hasScoutPackage && fileType === 'fixture') {
    recs.push('Add to @kbn/scout package for platform-wide fixtures');
  }

  return recs;
}

/**
 * Detect file type from path
 */
function detectFileType(path: string): string {
  if (path.includes('.spec.ts')) return 'test';
  if (path.includes('page_object') || path.includes('_page.ts')) return 'pageObject';
  if (path.includes('service') || path.includes('_service.ts')) return 'apiService';
  if (path.includes('fixture')) return 'fixture';
  return 'unknown';
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/\s+/g, '_');
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^(.)/, (char) => char.toUpperCase());
}
