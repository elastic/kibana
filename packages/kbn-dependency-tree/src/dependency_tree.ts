/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from '@kbn/repo-packages/utils/jsonc';

// Constants
const TREE_CHARS = {
  branch: '├─ ',
  last: '└─ ',
  pipe: '│  ',
  space: '   ',
};

const DEFAULT_MAX_DEPTH = 3;
const ROOT_PACKAGE_JSON_PATH = 'package.json';

// Global state
interface State {
  packageMap: Map<string, string> | null;
  reversePackageMap: Map<string, string> | null;
}

const state: State = {
  packageMap: null,
  reversePackageMap: null,
};

interface DependencyNode {
  id: string;
  tsconfigPath?: string;
  packagePath?: string;
  dependencies?: DependencyNode[];
  circular?: boolean;
  external?: boolean;
  noTsconfig?: boolean;
}

interface BuildOptions {
  maxDepth?: number;
  filter?: string;
}

/**
 * Loads and caches the package map from the root package.json dependencies
 */
function loadPackageMap(): Map<string, string> {
  if (state.packageMap) return state.packageMap;

  try {
    const packageJsonContent = fs.readFileSync(ROOT_PACKAGE_JSON_PATH, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    state.packageMap = new Map();
    state.reversePackageMap = new Map();

    // Parse dependencies for @kbn packages with "link:" prefix
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([packageName, packageSpec]) => {
        if (
          packageName.startsWith('@kbn/') &&
          typeof packageSpec === 'string' &&
          packageSpec.startsWith('link:')
        ) {
          const packagePath = packageSpec.replace('link:', '');
          state.packageMap!.set(packageName, packagePath);
          state.reversePackageMap!.set(packagePath, packageName);
        }
      });
    }

    return state.packageMap;
  } catch (error) {
    // TODO: Use logger instead of console.error - need to pass logger down from CLI context
    // eslint-disable-next-line no-console
    console.error('Failed to load package map from root package.json:', (error as Error).message);
    return new Map();
  }
}

/**
 * Extracts kbn_references from a tsconfig.json file
 */
function readTsconfigReferences(tsconfigPath: string): string[] {
  try {
    if (!fs.existsSync(tsconfigPath)) {
      // TODO: Use logger instead of console.warn - need to pass logger down from CLI context
      // eslint-disable-next-line no-console
      console.warn(`Warning: File does not exist at ${tsconfigPath}`);
      return [];
    }

    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    const tsconfig = parseJsonc(tsconfigContent);

    if (!tsconfig.kbn_references || !Array.isArray(tsconfig.kbn_references)) {
      return [];
    }

    return tsconfig.kbn_references.filter((ref: unknown): ref is string => {
      // Handle string references
      if (typeof ref === 'string') {
        return ref.startsWith('@kbn/');
      }
      // Skip object references (like { "path": "..." })
      return false;
    });
  } catch (error) {
    // TODO: Use logger instead of console.warn - need to pass logger down from CLI context
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: Could not read tsconfig at ${tsconfigPath}: ${(error as Error).message}`
    );
    return [];
  }
}

/**
 * Gets the file path for a given package name
 */
function getPackagePath(packageName: string): string | null {
  const pkgMap = loadPackageMap();
  return pkgMap.get(packageName) || null;
}

/**
 * Gets the package name for a given package path using reverse lookup
 */
function getPackageNameFromPath(packagePath: string): string | null {
  loadPackageMap(); // Ensure maps are loaded
  return state.reversePackageMap?.get(packagePath) || null;
}

/**
 * Finds the tsconfig.json file for a given package path
 */
function findTsconfigForPackage(packagePath: string): string | null {
  const tsconfigPath = path.join(packagePath, 'tsconfig.json');
  return fs.existsSync(tsconfigPath) ? tsconfigPath : null;
}

/**
 * Gets the package name from a tsconfig.json path using reverse lookup
 */
function getPackageNameFromTsconfig(tsconfigPath: string): string {
  const packagePath = path.dirname(tsconfigPath);

  // First try exact path lookup
  const packageName = getPackageNameFromPath(packagePath);
  if (packageName) {
    return packageName;
  } else {
    throw new Error(`Package name not found for tsconfig at ${tsconfigPath}`);
  }
}

/**
 * Applies filters to the list of references
 */
function applyFilters(references: string[], filter?: string): string[] {
  if (!filter) {
    return references;
  }

  return references.filter((ref) => ref.includes(filter));
}

/**
 * Creates a dependency node structure
 */
function createDependencyNode(packageName: string, tsconfigPath: string): DependencyNode {
  return {
    id: packageName,
    tsconfigPath,
    packagePath: path.dirname(tsconfigPath),
    dependencies: [],
  };
}

/**
 * Processes a single dependency reference
 */
function processDependency(
  refPackageName: string,
  depth: number,
  currentPath: string[],
  packageName: string,
  maxDepth: number,
  traverse: (tsconfigPath: string, depth: number, currentPath?: string[]) => DependencyNode | null
): DependencyNode | null {
  if (currentPath.includes(refPackageName)) {
    return { id: refPackageName, circular: true };
  }

  const refPackagePath = getPackagePath(refPackageName);
  if (!refPackagePath) {
    return { id: refPackageName, external: true };
  }

  const refTsconfigPath = findTsconfigForPackage(refPackagePath);
  if (!refTsconfigPath) {
    return { id: refPackageName, packagePath: refPackagePath, noTsconfig: true };
  }

  if (depth < maxDepth) {
    const newPath = [...currentPath, packageName];
    const childNode = traverse(refTsconfigPath, depth + 1, newPath);
    if (childNode) {
      return childNode;
    }
  }

  return {
    id: refPackageName,
    packagePath: refPackagePath,
    tsconfigPath: refTsconfigPath,
  };
}

/**
 * Builds a dependency tree from a tsconfig.json file
 */
export function buildDependencyTree(
  tsconfigPath: string,
  options: BuildOptions = {}
): DependencyNode | null {
  const maxDepth = options.maxDepth || DEFAULT_MAX_DEPTH;
  const filter = options.filter;
  const nodeCache = new Map<string, DependencyNode>(); // Cache complete dependency nodes
  const processing = new Set<string>();

  function traverse(
    currentTsconfigPath: string,
    depth: number,
    currentPath: string[] = []
  ): DependencyNode | null {
    if (depth > maxDepth) return null;

    const packageName = getPackageNameFromTsconfig(currentTsconfigPath);

    if (processing.has(packageName)) {
      return { id: packageName, circular: true };
    }

    // Return cached node if already processed
    if (nodeCache.has(packageName)) {
      return nodeCache.get(packageName)!;
    }

    if (currentPath.includes(packageName)) {
      return { id: packageName, circular: true };
    }

    processing.add(packageName);
    const references = readTsconfigReferences(currentTsconfigPath);
    const filteredRefs = applyFilters(references, filter);

    const node = createDependencyNode(packageName, currentTsconfigPath);

    for (const refPackageName of filteredRefs) {
      const dependency = processDependency(
        refPackageName,
        depth,
        currentPath,
        packageName,
        maxDepth,
        traverse
      );
      if (dependency) {
        node.dependencies!.push(dependency);
      }
    }

    processing.delete(packageName);
    nodeCache.set(packageName, node); // Cache the complete node
    return node;
  }

  return traverse(tsconfigPath, 0);
}

/**
 * Prints the dependency tree in a visual format
 */
export function printTree(
  node: DependencyNode | null,
  prefix = '',
  isLast = true,
  showPaths = false
): void {
  if (!node) return;

  const connector = isLast ? TREE_CHARS.last : TREE_CHARS.branch;
  let info = '';

  if (showPaths && !node.circular && !node.external) {
    if (node.packagePath) {
      info = ` (${node.packagePath})`;
    } else if (node.tsconfigPath) {
      info = ` (${path.dirname(node.tsconfigPath)})`;
    }
  }

  let label = node.id;
  if (node.circular) {
    label += ' [CIRCULAR]';
  } else if (node.external) {
    label += ' [EXTERNAL]';
  } else if (node.noTsconfig) {
    label += ' [NO-TSCONFIG]';
  }

  // TODO: Use logger instead of console.log - need to pass logger down from CLI context
  // eslint-disable-next-line no-console
  console.log(prefix + connector + label + info);

  if (node.dependencies && node.dependencies.length > 0) {
    const newPrefix = prefix + (isLast ? TREE_CHARS.space : TREE_CHARS.pipe);

    for (let i = 0; i < node.dependencies.length; i++) {
      const child = node.dependencies[i];
      const isLastChild = i === node.dependencies.length - 1;
      printTree(child, newPrefix, isLastChild, showPaths);
    }
  }
}

/**
 * Prints the dependency tree as JSON
 */
export function printJson(tree: DependencyNode | null): void {
  // TODO: Use logger instead of console.log - need to pass logger down from CLI context
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(tree, null, 2));
}
