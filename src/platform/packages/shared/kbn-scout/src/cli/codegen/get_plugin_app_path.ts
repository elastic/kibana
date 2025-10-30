/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';

export async function getPluginPath(plugin: string): Promise<string> {
  const rootPackageJson = await fs.readFile(path.join(REPO_ROOT, 'package.json'), 'utf-8');
  const rootPackageJsonObject = JSON.parse(rootPackageJson);
  const { dependencies } = rootPackageJsonObject;

  const pluginPath = dependencies[`@kbn/${plugin}`]?.replace('link:', '') ?? '';

  if (!pluginPath) {
    throw new Error(`Plugin path not found for ${plugin}`);
  }

  return pluginPath;
}

/**
 * Helper to resolve a constant/variable value from file content
 * Handles simple strings, template literals, and recursively resolves nested variables
 */
function resolveConstantValue(
  variableName: string,
  fileContent: string,
  visitedVariables = new Set<string>()
): string {
  // Prevent infinite recursion
  if (visitedVariables.has(variableName)) {
    return '';
  }
  visitedVariables.add(variableName);

  // Try to find the constant definition
  // Pattern 1: const VAR = 'string' or "string"
  const stringPattern = new RegExp(
    `(?:export\\s+)?const\\s+${variableName}\\s*=\\s*['"]([^'"]+)['"]`,
    'g'
  );
  const stringMatch = stringPattern.exec(fileContent);
  if (stringMatch) {
    return stringMatch[1];
  }

  // Pattern 2: const VAR = `template ${OTHER_VAR} literal`
  const templatePattern = new RegExp(
    `(?:export\\s+)?const\\s+${variableName}\\s*=\\s*\`([^\`]+)\``,
    'g'
  );
  const templateMatch = templatePattern.exec(fileContent);
  if (templateMatch) {
    let templateString = templateMatch[1];

    // Find all ${...} placeholders
    const placeholderPattern = /\$\{([A-Z_][A-Z0-9_]*)\}/g;
    const placeholders = Array.from(templateString.matchAll(placeholderPattern));

    // Recursively resolve each placeholder
    for (const placeholder of placeholders) {
      const placeholderName = placeholder[1];
      const resolvedValue = resolveConstantValue(placeholderName, fileContent, visitedVariables);

      if (resolvedValue) {
        templateString = templateString.replace(placeholder[0], resolvedValue);
      }
    }

    return templateString;
  }

  return '';
}

export async function getAppRouteFromPlugin(pluginAppPath: string): Promise<string> {
  // Resolve path relative to REPO_ROOT if it's not absolute
  const resolvedPath = path.isAbsolute(pluginAppPath)
    ? pluginAppPath
    : path.join(REPO_ROOT, pluginAppPath);

  // Check if plugin.ts exists
  if (!existsSync(resolvedPath)) {
    // Extract a meaningful plugin name from the path for error message
    const pathParts = pluginAppPath.split('/');
    const pluginName = pathParts[pathParts.length - 3] || pluginAppPath; // Get the directory before 'public'
    throw new Error(`Plugin app path not found for ${pluginName}`);
  }

  const pluginContent = await fs.readFile(resolvedPath, 'utf-8');
  const pluginDir = path.dirname(resolvedPath);

  // Collect all file contents to search (plugin.ts + common constant files)
  const filesToSearch: string[] = [pluginContent];
  const commonConstantFiles = [
    path.join(pluginDir, '../common/constants.ts'),
    path.join(pluginDir, '../common/index.ts'),
    path.join(pluginDir, 'constants.ts'),
  ];

  for (const constantFile of commonConstantFiles) {
    if (existsSync(constantFile)) {
      const content = await fs.readFile(constantFile, 'utf-8');
      filesToSearch.push(content);
    }
  }

  // Combine all file contents for easier searching
  const combinedContent = filesToSearch.join('\n\n');

  // Find all core.application.register blocks (multiline-safe)
  // This regex captures the entire register call including nested braces
  const registerPattern = /core\.application\.register\s*\(\s*\{([\s\S]*?)\}\s*\)/g;
  const registerMatches = Array.from(pluginContent.matchAll(registerPattern));

  for (const registerMatch of registerMatches) {
    const configBlock = registerMatch[1];

    // Strategy 1: Try to match string literal appRoute
    const stringLiteralPattern = /appRoute:\s*['"]([^'"]+)['"]/;
    const stringMatch = configBlock.match(stringLiteralPattern);
    if (stringMatch) {
      return stringMatch[1];
    }

    // Strategy 2: Try to match template literal appRoute
    const templateLiteralPattern = /appRoute:\s*`([^`]+)`/;
    const templateMatch = configBlock.match(templateLiteralPattern);
    if (templateMatch) {
      let templateString = templateMatch[1];

      // Find and resolve all ${...} placeholders
      const placeholderPattern = /\$\{([A-Z_][A-Z0-9_]*)\}/g;
      const placeholders = Array.from(templateString.matchAll(placeholderPattern));

      for (const placeholder of placeholders) {
        const placeholderName = placeholder[1];
        const resolvedValue = resolveConstantValue(placeholderName, combinedContent);

        if (resolvedValue) {
          templateString = templateString.replace(placeholder[0], resolvedValue);
        }
      }

      return templateString;
    }

    // Strategy 3: Try to match variable appRoute
    const variablePattern = /appRoute:\s*([A-Z_][A-Z0-9_]*)/;
    const variableMatch = configBlock.match(variablePattern);
    if (variableMatch) {
      const variableName = variableMatch[1];
      const resolvedValue = resolveConstantValue(variableName, combinedContent);

      if (resolvedValue) {
        return resolvedValue;
      }
    }

    // Strategy 4: Fallback to id-based route (when appRoute is not specified)
    // Try string literal id first
    const idStringPattern = /id:\s*['"]([^'"]+)['"]/;
    const idStringMatch = configBlock.match(idStringPattern);
    if (idStringMatch) {
      return `/app/${idStringMatch[1]}`;
    }

    // Try variable-based id
    const idVariablePattern = /id:\s*([A-Z_][A-Z0-9_]*)/;
    const idVariableMatch = configBlock.match(idVariablePattern);
    if (idVariableMatch) {
      const variableName = idVariableMatch[1];
      const resolvedValue = resolveConstantValue(variableName, combinedContent);

      if (resolvedValue) {
        return `/app/${resolvedValue}`;
      }
    }
  }

  // If we get here, we couldn't find any app route
  const pathParts = pluginAppPath.split('/');
  const pluginName = pathParts[pathParts.length - 3] || pluginAppPath;
  throw new Error(`Plugin app path not found for ${pluginName}`);
}
