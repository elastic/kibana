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
  apis: string[];
}

interface FileUsage {
  filePath: string;
  apis: string[];
}

interface TeamGroup {
  team: string;
  fileCount: number;
  files: FileUsage[];
}

interface AnalysisResult {
  dependencyName: string;
  totalScannedFiles: number;
  totalMatchingFiles: number;
  uniqueApis: string[];
  matchingFilesByTeam: TeamGroup[];
  matchingFiles: string[];
  analysisTimeMs: number;
}

interface CodeOwnerRule {
  pattern: string;
  teams: string[];
  specificity: number; // Higher = more specific
}

const findDependencyReferencesInputSchema = z.object({
  dependencyName: z.string().describe('The name of the dependency to search for (e.g., "enzyme")'),
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
    apis: [],
  };

  // Escape special regex characters in dependency name
  const escapedDep = dependencyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Split content into lines for more precise matching
  const lines = content.split('\n');

  // Find ES6/CommonJS imports
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for ES6 imports (can be multiline)
    if (line.startsWith('import') && !line.startsWith('import(')) {
      let fullImport = lines[i];
      let endLine = i;

      // Handle multiline imports - keep collecting lines until we find 'from'
      if (!line.includes('from')) {
        for (let j = i + 1; j < lines.length; j++) {
          fullImport += '\n' + lines[j];
          endLine = j;
          if (lines[j].includes('from')) {
            break;
          }
        }
      }

      // Only add if it's importing from our specific dependency
      const fromPattern = new RegExp(`from\\s+['"\`]${escapedDep}['"\`]`);
      if (fromPattern.test(fullImport)) {
        result.found = true;
      }

      // Skip the lines we've already processed (whether matched or not)
      i = endLine;
      continue;
    }

    // Check for CommonJS require (only the line with our dependency)
    const requirePattern = new RegExp(`require\\s*\\(\\s*['"\`]${escapedDep}['"\`]\\s*\\)`);
    if (requirePattern.test(line)) {
      result.found = true;
    }

    // Check for dynamic imports
    const dynamicImportPattern = new RegExp(`import\\s*\\(\\s*['"\`]${escapedDep}['"\`]\\s*\\)`);
    if (dynamicImportPattern.test(line)) {
      result.found = true;
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

function loadCodeOwners(): CodeOwnerRule[] {
  const codeownersPath = path.join(REPO_ROOT, '.github', 'CODEOWNERS');
  const rules: CodeOwnerRule[] = [];

  try {
    const content = fs.readFileSync(codeownersPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse line: pattern @team1 @team2 ...
      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) {
        continue;
      }

      const pattern = parts[0];
      const teams = parts.slice(1).filter((part) => part.startsWith('@'));

      if (teams.length > 0) {
        // Calculate specificity: more path segments = more specific
        const specificity = pattern.split('/').filter((seg) => seg && seg !== '*').length;

        rules.push({
          pattern,
          teams,
          specificity,
        });
      }
    }
  } catch (error) {
    // If CODEOWNERS doesn't exist or can't be read, return empty array
    // Silently fail - files will be marked as @unowned
  }

  return rules;
}

function matchPathToPattern(filePath: string, pattern: string): boolean {
  // Normalize paths
  const normalizedPath = filePath.replace(/\\/g, '/');
  let normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle leading slash in pattern
  if (normalizedPattern.startsWith('/')) {
    normalizedPattern = normalizedPattern.substring(1);
  }

  // Convert glob pattern to regex
  let regexPattern = normalizedPattern
    .replace(/\./g, '\\.') // Escape dots
    .replace(/\*\*/g, '___DOUBLESTAR___') // Placeholder for **
    .replace(/\*/g, '[^/]*') // Single * matches anything except /
    .replace(/___DOUBLESTAR___/g, '.*'); // ** matches anything including /

  // If pattern doesn't end with /, it should match the exact path or paths within it
  if (!normalizedPattern.endsWith('/') && !normalizedPattern.includes('*')) {
    regexPattern = `^${regexPattern}(/.*)?$`;
  } else {
    regexPattern = `^${regexPattern}`;
  }

  const regex = new RegExp(regexPattern);
  return regex.test(normalizedPath);
}

function getTeamForFile(filePath: string, rules: CodeOwnerRule[]): string[] {
  const relativePath = path.relative(REPO_ROOT, filePath);

  // Find all matching rules
  const matchingRules = rules.filter((rule) => matchPathToPattern(relativePath, rule.pattern));

  if (matchingRules.length === 0) {
    return ['@unowned'];
  }

  // Sort by specificity (most specific last) and return the most specific rule's teams
  matchingRules.sort((a, b) => a.specificity - b.specificity);
  const mostSpecificRule = matchingRules[matchingRules.length - 1];

  return mostSpecificRule.teams;
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

function analyzeDependency(dependencyName: string): AnalysisResult {
  const startTime = Date.now();
  const gitignorePatterns = loadGitignore();
  const codeOwnerRules = loadCodeOwners();

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

  // Group files by team ownership
  const filesByTeam = new Map<string, string[]>();
  const sortedFiles = Array.from(usageResults.keys()).sort();

  for (const filePath of sortedFiles) {
    const teams = getTeamForFile(filePath, codeOwnerRules);
    // Use the primary (first) team for grouping
    const primaryTeam = teams[0];

    if (!filesByTeam.has(primaryTeam)) {
      filesByTeam.set(primaryTeam, []);
    }
    filesByTeam.get(primaryTeam)!.push(filePath);
  }

  // Build team groups with full file details
  const filesByTeamResult: TeamGroup[] = Array.from(filesByTeam.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, files]) => ({
      team,
      fileCount: files.length,
      files: files.map((filePath) => {
        const usage = usageResults.get(filePath)!;
        return {
          filePath: path.relative(REPO_ROOT, filePath),
          apis: usage.apis,
        };
      }),
    }));

  const endTime = Date.now();

  return {
    dependencyName,
    totalScannedFiles: allFiles.length,
    totalMatchingFiles: usageResults.size,
    uniqueApis: Array.from(apiUsage).sort(),
    matchingFilesByTeam: filesByTeamResult,
    matchingFiles: sortedFiles.map((file) => path.relative(REPO_ROOT, file)),
    analysisTimeMs: endTime - startTime,
  };
}

export const findDependencyReferencesTool: ToolDefinition<
  typeof findDependencyReferencesInputSchema
> = {
  name: 'find_dependency_references',
  description:
    'Find all files that import or use a specific dependency in the codebase, grouped by team ownership from CODEOWNERS',
  inputSchema: findDependencyReferencesInputSchema,
  handler: async (input) => {
    const result = analyzeDependency(input.dependencyName);
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
