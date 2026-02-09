/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import { join, parse, resolve } from 'path';

export function getI18nIdentifierFromFilePath(fileName: string, cwd: string) {
  const { dir } = parse(fileName);

  const relativePathToFile = dir.replace(cwd, '');

  // We need to match the path of the file with entries in i18nrc.json files.
  // The two i18nrc files use different path formats:
  // - x-pack/.i18nrc.json: paths WITHOUT 'x-pack/' prefix (e.g., "solutions/observability/plugins/observability")
  // - root .i18nrc.json: paths WITH 'x-pack/' prefix (e.g., "x-pack/solutions/observability/packages/alert-details")
  //
  // We use the presence of 'src' in the path as a heuristic:
  // - Paths with 'src' (packages, or src/platform/...) typically need the full path including any x-pack prefix
  // - Paths without 'src' (x-pack plugins) typically match x-pack/.i18nrc.json which omits the x-pack prefix
  const relativePathArray = relativePathToFile.includes('src')
    ? relativePathToFile.split('/').slice(1) // Keep x-pack prefix if present
    : relativePathToFile.split('/').slice(2); // Remove leading empty string and x-pack

  // Find where the package/plugin source directory starts
  // Plugins use 'public', 'server', or 'common'; packages typically use 'src'
  // We need to find the source directory that comes AFTER the package/plugin name,
  // not the 'src' at the beginning of paths like 'src/platform/...'
  let pluginNameIndex = relativePathArray.findIndex(
    (el) => el === 'public' || el === 'server' || el === 'common'
  );

  // If not found, look for 'src' but skip if it's at the beginning (index 0 or 1)
  if (pluginNameIndex === -1) {
    pluginNameIndex = relativePathArray.findIndex((el, index) => el === 'src' && index > 1);
  }

  // Build the path to match against i18nrc.json entries
  // Root .i18nrc.json uses paths with 'x-pack/' prefix, while x-pack/.i18nrc.json doesn't
  const fullPath = relativePathArray.slice(0, pluginNameIndex).join('/');
  const pathWithoutXpack = fullPath.replace('x-pack/', '');

  const xpackRC = resolve(join(__dirname, '../../../'), 'x-pack/.i18nrc.json');
  const rootRC = resolve(join(__dirname, '../../../'), '.i18nrc.json');

  const xpackI18nrcFile = fs.readFileSync(xpackRC, 'utf8');
  const xpackI18nrc = JSON.parse(xpackI18nrcFile);

  const rootI18nrcFile = fs.readFileSync(rootRC, 'utf8');
  const rootI18nrc = JSON.parse(rootI18nrcFile);

  const allPaths = { ...xpackI18nrc.paths, ...rootI18nrc.paths };

  if (Object.keys(allPaths).length === 0) return 'could_not_find_i18nrc';

  // First try exact matches with both path variants
  for (const [k, v] of Object.entries(allPaths)) {
    if (
      matchesPath(v as string | string[], fullPath) ||
      matchesPath(v as string | string[], pathWithoutXpack)
    ) {
      return k;
    }
  }

  // Fallback to substring (legacy behavior)
  for (const [k, v] of Object.entries(allPaths)) {
    if (
      includesPath(v as string | string[], fullPath) ||
      includesPath(v as string | string[], pathWithoutXpack)
    ) {
      return k;
    }
  }

  // No matching i18n identifier found
  return undefined;
}

// Helper to check if a path matches an i18nrc entry value
const matchesPath = (entryValue: string | string[], pathToMatch: string): boolean => {
  if (Array.isArray(entryValue)) {
    return entryValue.some((p) => p === pathToMatch);
  }
  return entryValue === pathToMatch;
};

// Helper to check if a path is included in an i18nrc entry value (substring match)
// Check both directions: pathToMatch.includes(entryValue) OR entryValue.startsWith(pathToMatch)
// The latter handles cases where i18nrc entry includes '/src' suffix but computed path doesn't
const includesPath = (entryValue: string | string[], pathToMatch: string): boolean => {
  if (Array.isArray(entryValue)) {
    return entryValue.some((p) => pathToMatch.includes(p) || p.startsWith(pathToMatch));
  }
  return pathToMatch.includes(entryValue) || entryValue.startsWith(pathToMatch);
};
