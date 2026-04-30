/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as JSON5 from 'json5';
import { getKibanaDir } from '../utils';
import { UNCATEGORIZED_MODULE_ID } from './const';

export interface ModuleLookup {
  /**
   * `"src/core/packages/http/server-internal"` → `"@kbn/core-http-server-internal"`
   */
  byDir: Map<string, string>;
  /**
   * `"@kbn/core-http-server-internal"` → `"src/core/packages/http/server-internal"`
   */
  byId: Map<string, string>;
}

let cachedModuleLookup: ModuleLookup | null = null;

export function resetModuleLookupCache(): void {
  cachedModuleLookup = null;
}

export function getModuleLookup(): ModuleLookup {
  if (cachedModuleLookup) {
    return cachedModuleLookup;
  }

  const root = getKibanaDir();
  const files = discoverKibanaJsoncFiles(root);

  const byDir = new Map<string, string>();
  const byId = new Map<string, string>();

  for (const file of files) {
    if (file.includes('__fixtures__')) {
      continue;
    }
    const dir = path.dirname(file);
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    const config = JSON5.parse(content);
    if (config.id && typeof config.id === 'string') {
      byDir.set(dir, config.id);
      byId.set(config.id, dir);
    }
  }

  cachedModuleLookup = { byDir, byId };
  return cachedModuleLookup;
}

export function findModuleForPath(filePath: string): string | undefined {
  const lookup = getModuleLookup();
  const normalizedFilePath = filePath.replace(/\\/g, '/');

  let longestPrefix = '';
  for (const moduleDir of lookup.byDir.keys()) {
    const normalizedDir = moduleDir.replace(/\\/g, '/').replace(/\/$/, '');
    if (
      normalizedFilePath === normalizedDir ||
      normalizedFilePath.startsWith(normalizedDir + '/')
    ) {
      if (moduleDir.length > longestPrefix.length) {
        longestPrefix = moduleDir;
      }
    }
  }

  return lookup.byDir.get(longestPrefix) || UNCATEGORIZED_MODULE_ID;
}

export function getModuleDependencies(moduleDir: string): string[] {
  const root = getKibanaDir();
  const tsconfigPath = path.join(root, moduleDir, 'tsconfig.json');

  let content: string;
  try {
    content = fs.readFileSync(tsconfigPath, 'utf8');
  } catch {
    return [];
  }
  const tsconfig = JSON5.parse(content);
  if (Array.isArray(tsconfig?.kbn_references)) {
    return tsconfig.kbn_references.filter((ref: unknown) => typeof ref === 'string');
  }
  return [];
}

export function buildModuleDownstreamGraph(): Map<string, Set<string>> {
  const lookup = getModuleLookup();
  const downstreamMap = new Map<string, Set<string>>();

  for (const moduleId of lookup.byDir.values()) {
    downstreamMap.set(moduleId, new Set<string>());
  }

  for (const [moduleDir, moduleId] of lookup.byDir.entries()) {
    const deps = getModuleDependencies(moduleDir);
    for (const depId of deps) {
      const downstreams = downstreamMap.get(depId);
      if (downstreams) {
        downstreams.add(moduleId);
      }
    }
  }

  return downstreamMap;
}

function discoverKibanaJsoncFiles(root: string): string[] {
  try {
    const output = execSync('git ls-files "*/kibana.jsonc" "kibana.jsonc" --diff-filter=d', {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const files = output.split('\n').filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // Not a git repo or git not available – fall through to FS walk
  }

  return walkForKibanaJsonc(root);
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'target',
  'build',
  'bazel-out',
  '__fixtures__',
]);
function walkForKibanaJsonc(root: string, relDir = ''): string[] {
  const results: string[] = [];
  const absDir = relDir ? path.join(root, relDir) : root;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
      const childRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      results.push(...walkForKibanaJsonc(root, childRel));
    } else if (entry.isFile() && entry.name === 'kibana.jsonc') {
      results.push(relDir ? `${relDir}/kibana.jsonc` : 'kibana.jsonc');
    }
  }

  return results;
}
