/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { parentPort, workerData } = require('worker_threads');
const { readFileSync, statSync } = require('fs');
const path = require('path');
const ignore = require('ignore');

// Max file size to process (2MB) to avoid memory spikes with minified files
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Patterns to identify npm packages (not relative imports or @kbn/* packages)
const NPM_PACKAGE_PATTERN = /^(?!\.|@kbn\/)[@a-zA-Z][\w\-./]*$/;

// State for CODEOWNERS
let codeOwnersEntries = null;
let REPO_ROOT = null;

// Initialize CODEOWNERS data
if (workerData) {
  REPO_ROOT = workerData.repoRoot;
  initializeCodeOwners(workerData.codeOwnersPath);
}

function initializeCodeOwners(codeOwnersPath) {
  try {
    const content = readFileSync(codeOwnersPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const entries = [];

    for (const line of lines) {
      if (!line || line.startsWith('#') || line.includes('@kibanamachine')) continue;

      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const [pattern, ...teams] = trimmedLine.replace(/#.+$/, '').split(/\s+/);
      const pathPattern = pattern.replace(/\/$/, '');
      const validTeams = teams.map((t) => t.replace('@', '')).filter((t) => t.length > 0);

      if (validTeams.length > 0) {
        entries.push({
          pattern: pathPattern,
          teams: validTeams,
          matcher: ignore().add(pathPattern),
        });
      }
    }
    // Reverse as lower entries override earlier ones
    codeOwnersEntries = entries.reverse();
  } catch (e) {
    console.error('Failed to initialize CODEOWNERS in worker:', e);
    codeOwnersEntries = [];
  }
}

function getTeamsForPath(filePath) {
  if (!codeOwnersEntries || !REPO_ROOT) return [];

  // Convert absolute path to repo-relative path
  const relativePath = path.relative(REPO_ROOT, filePath);

  const entry = codeOwnersEntries.find((p) => p.matcher.test(relativePath).ignored);
  return entry ? entry.teams : [];
}

/**
 * Extract import statements from file content using regex
 */
function extractImportsFromContent(content) {
  const imports = new Set();
  let match;

  // 1. import ... from "package"
  const importFromRegex = /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
  while ((match = importFromRegex.exec(content)) !== null) {
    addPackageIfValid(match[1], imports);
  }

  // 2. import("package")
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    addPackageIfValid(match[1], imports);
  }

  // 3. require('package')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    addPackageIfValid(match[1], imports);
  }

  // 4. export ... from "package"
  const exportFromRegex = /export\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  while ((match = exportFromRegex.exec(content)) !== null) {
    addPackageIfValid(match[1], imports);
  }

  return Array.from(imports);
}

function addPackageIfValid(importPath, imports) {
  if (NPM_PACKAGE_PATTERN.test(importPath)) {
    const packageName = importPath
      .split('/')
      .slice(0, importPath.startsWith('@') ? 2 : 1)
      .join('/');
    imports.add(packageName);
  }
}

if (parentPort) {
  parentPort.on('message', (data) => {
    try {
      const { filePath, relativePath } = data;

      // 1. Get teams for this file (CPU intensive matching)
      const teams = getTeamsForPath(filePath);

      if (teams.length === 0) {
        parentPort.postMessage({
          relativePath,
          skipped: true,
          success: true,
        });
        return;
      }

      // 2. Read file and extract imports
      // Check file size first to avoid reading huge files into memory
      try {
        const stats = statSync(filePath);
        if (stats.size > MAX_FILE_SIZE) {
          parentPort.postMessage({
            relativePath,
            skipped: true,
            success: true,
          });
          return;
        }
      } catch (e) {
        // If we can't stat, skip (maybe deleted)
        parentPort.postMessage({
          relativePath,
          skipped: true,
          success: true,
        });
        return;
      }

      const content = readFileSync(filePath, 'utf8');
      const imports = extractImportsFromContent(content);

      // Send result back
      parentPort.postMessage({
        relativePath,
        imports,
        teams,
        success: true,
      });
    } catch (error) {
      parentPort.postMessage({
        relativePath: data.relativePath,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
