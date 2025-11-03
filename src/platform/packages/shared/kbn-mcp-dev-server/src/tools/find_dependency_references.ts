/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolDefinition } from '../types';

// File extensions to analyze
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.d.ts'];

interface UsageResult {
  found: boolean;
  imports: string[];
  apis: string[];
}

interface FileUsage {
  filePath: string;
  imports: string[];
  apis: string[];
}

interface DirectoryGroup {
  directory: string;
  fileCount: number;
  files: FileUsage[];
}

interface AnalysisResult {
  dependencyName: string;
  totalScannedFiles: number;
  totalMatchingFiles: number;
  uniqueApis: string[];
  matchingFilesByDirectory: DirectoryGroup[];
  matchingFiles: string[];
  analysisTimeMs: number;
}

const findDependencyReferencesInputSchema = z.object({
  dependencyName: z.string().describe('The name of the dependency to search for (e.g., "enzyme")'),
  verbose: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include detailed information about each file'),
});

function loadGitignore(): Set<string> {
  const gitignorePath = path.join(REPO_ROOT, '.gitignore');
  const patterns = new Set<string>();

  const content = fs.readFileSync(gitignorePath, 'utf8');
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((pattern) => patterns.add(pattern));

  return patterns;
}

function shouldIgnoreFile(filePath: string, gitignorePatterns: Set<string>): boolean {
  const relativePath = path.relative(REPO_ROOT, filePath);

  // Only ignore directories that start with a dot at the root level
  const firstSegment = relativePath.split(path.sep)[0];
  if (firstSegment.startsWith('.')) {
    return true;
  }

  // Re-enable basic gitignore patterns but be more selective
  for (const pattern of gitignorePatterns) {
    // Skip overly broad patterns that might exclude too much
    if (pattern === '*' || pattern === '**' || pattern.length < 2) {
      continue;
    }

    // Handle patterns that start with /
    if (pattern.startsWith('/')) {
      const patternWithoutSlash = pattern.substring(1);
      if (
        relativePath === patternWithoutSlash ||
        relativePath.startsWith(patternWithoutSlash + '/')
      ) {
        return true;
      }
    }

    // Handle simple patterns
    if (!pattern.includes('/') && !pattern.includes('*')) {
      // Simple filename or directory name
      const parts = relativePath.split(path.sep);
      if (parts.includes(pattern)) {
        return true;
      }
    }
  }

  return false;
}

function getAllFiles(dir: string, gitignorePatterns: Set<string>): string[] {
  const files: string[] = [];

  function scanDirectory(currentDir: string) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);

        if (shouldIgnoreFile(fullPath, gitignorePatterns)) {
          continue;
        }

        let stat;
        try {
          stat = fs.lstatSync(fullPath);
        } catch (error) {
          // Skip files we can't stat (broken symlinks, permission issues)
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && SUPPORTED_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  scanDirectory(dir);
  return files;
}

function findDependencyUsage(content: string, dependencyName: string): UsageResult {
  const result: UsageResult = {
    found: false,
    imports: [],
    apis: [],
  };

  // Import patterns to match
  const importPatterns = [
    // ES6 imports (multiline support with [\s\S]*?)
    new RegExp(`import\\s+[\\s\\S]*?from\\s+['"\`]${dependencyName}['"\`]`, 'g'),
    new RegExp(`import\\s+['"\`]${dependencyName}['"\`]`, 'g'),

    // CommonJS require
    new RegExp(`require\\s*\\(\\s*['"\`]${dependencyName}['"\`]\\s*\\)`, 'g'),

    // Dynamic imports
    new RegExp(`import\\s*\\(\\s*['"\`]${dependencyName}['"\`]\\s*\\)`, 'g'),
  ];

  // Check for imports
  for (const pattern of importPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      result.found = true;
      result.imports.push(...matches);
    }
  }

  if (result.found) {
    // Find API usage patterns
    result.apis = extractApiUsage(content, dependencyName);
  }

  return result;
}

function extractApiUsage(content: string, dependencyName: string): string[] {
  const apis = new Set<string>();

  // Common patterns for API usage
  const patterns = [
    // moment().format(), lodash.get(), etc. - direct chaining
    new RegExp(`${dependencyName}\\s*\\([^)]*\\)\\s*\\.\\s*(\\w+)`, 'g'),

    // moment.utc(), lodash.isEmpty(), etc. - static methods
    new RegExp(`${dependencyName}\\s*\\.\\s*(\\w+)\\s*\\(`, 'g'),

    // Destructured imports: { format, parse } from 'moment' (multiline support)
    new RegExp(`{([^}]*)}\\s*from\\s+['"\`]${dependencyName}['"\`]`, 'g'),
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        if (pattern.source.includes('{([^}]*)}')) {
          // Handle destructured imports - split by comma and clean up
          const destructuredItems = match[1].split(',').map((item) => {
            // Remove 'as alias' parts and normalize whitespace (including newlines)
            return item
              .replace(/\s+as\s+\w+/g, '')
              .replace(/\s+/g, ' ')
              .trim();
          });
          destructuredItems.forEach((item) => {
            const cleanItem = item.trim();
            // Only keep valid identifiers (single words)
            if (cleanItem && /^\w+$/.test(cleanItem)) {
              apis.add(cleanItem);
            }
          });
        } else {
          // Regular API method calls
          const apiName = match[1].replace(/\s+/g, ' ').trim();
          if (apiName && /^\w+$/.test(apiName)) {
            apis.add(apiName);
          }
        }
      }
    }
  }

  // Look for method calls on variables that are assigned from our dependency
  const variableAssignments = new Map<string, boolean>();

  // Find variable assignments: const m = moment(), const util = lodash, etc.
  const assignmentPattern = new RegExp(
    `\\b(\\w+)\\s*=\\s*${dependencyName}\\s*(?:\\([^)]*\\))?`,
    'g'
  );
  let assignMatch;
  while ((assignMatch = assignmentPattern.exec(content)) !== null) {
    if (assignMatch[1]) {
      variableAssignments.set(assignMatch[1], true);
    }
  }

  // Now find method calls on those variables
  if (variableAssignments.size > 0) {
    const methodCallPattern = /\b(\w+)\s*\.\s*(\w+)\s*\(/g;
    let methodMatch;
    while ((methodMatch = methodCallPattern.exec(content)) !== null) {
      const [, varName, methodName] = methodMatch;
      if (variableAssignments.has(varName)) {
        apis.add(methodName);
      }
    }
  }

  return Array.from(apis);
}

function analyzeFileForDependency(filePath: string, dependencyName: string): UsageResult | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const usages = findDependencyUsage(content, dependencyName);

    if (usages.found) {
      return usages;
    }
  } catch (error) {
    // Skip files we can't read
  }

  return null;
}

function analyzeDependency(dependencyName: string, isVerbose: boolean): AnalysisResult {
  const startTime = Date.now();
  const gitignorePatterns = loadGitignore();

  const allFiles = getAllFiles(REPO_ROOT, gitignorePatterns);
  const usageResults = new Map<string, UsageResult>();
  const apiUsage = new Set<string>();

  for (const file of allFiles) {
    const usage = analyzeFileForDependency(file, dependencyName);
    if (usage) {
      usageResults.set(file, usage);
      usage.apis.forEach((api) => apiUsage.add(api));
    }
  }

  // Group files by top-level directory
  const filesByTopLevel = new Map<string, string[]>();
  const sortedFiles = Array.from(usageResults.keys()).sort();

  for (const filePath of sortedFiles) {
    const relativePath = path.relative(REPO_ROOT, filePath);
    const topLevelDir = relativePath.split(path.sep)[0];

    if (!filesByTopLevel.has(topLevelDir)) {
      filesByTopLevel.set(topLevelDir, []);
    }
    filesByTopLevel.get(topLevelDir)!.push(filePath);
  }

  // Build directory groups
  const filesByDirectory: DirectoryGroup[] = Array.from(filesByTopLevel.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([directory, files]) => ({
      directory,
      fileCount: files.length,
      files: isVerbose
        ? files.map((filePath) => {
            const usage = usageResults.get(filePath)!;
            return {
              filePath: path.relative(REPO_ROOT, filePath),
              imports: usage.imports,
              apis: usage.apis,
            };
          })
        : [],
    }));

  const endTime = Date.now();

  return {
    dependencyName,
    totalScannedFiles: allFiles.length,
    totalMatchingFiles: usageResults.size,
    uniqueApis: Array.from(apiUsage).sort(),
    matchingFilesByDirectory: filesByDirectory,
    matchingFiles: sortedFiles.map((file) => path.relative(REPO_ROOT, file)),
    analysisTimeMs: endTime - startTime,
  };
}

export const findDependencyReferencesTool: ToolDefinition<
  typeof findDependencyReferencesInputSchema
> = {
  name: 'find_dependency_references',
  description: 'Find all files that import or use a specific dependency in the codebase',
  inputSchema: findDependencyReferencesInputSchema,
  handler: async (input) => {
    const result = analyzeDependency(input.dependencyName, input.verbose ?? false);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
