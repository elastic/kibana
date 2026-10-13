/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lstatSync, readdirSync, readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import normalizePackageData from 'normalize-package-data';

export interface PackageNode {
  readonly json: normalizePackageData.Package;
  readonly realPath: string;
  /** Reachable from the root through `dependencies`, `optionalDependencies` or `peerDependencies`. */
  isProduction: boolean;
  /** Resolved dependencies first, then any other packages installed in its own `node_modules`. */
  edges: PackageNode[];
}

interface TreeNode extends PackageNode {
  readonly installName: string;
  /** Unset for the root and symlinked packages, which stops dependency resolution there. */
  readonly parent?: TreeNode;
  readonly children: Map<string, TreeNode>;
}

/**
 * Reads the physical `node_modules` tree under `directory` and resolves each package's
 * dependencies the way `require()` would, walking up through parent `node_modules` folders.
 */
export function readPackageTree(directory: string): PackageNode {
  const byRealPath = new Map<string, TreeNode>();
  const root = readNode(directory, undefined, undefined, byRealPath);
  if (!root) {
    throw new Error(`Unable to read package.json in ${directory}`);
  }

  for (const node of byRealPath.values()) {
    node.edges = resolveEdges(node);
  }
  markProduction(root);

  return root;
}

function readNode(
  folder: string,
  installName: string | undefined,
  parent: TreeNode | undefined,
  byRealPath: Map<string, TreeNode>
): TreeNode | undefined {
  const json = readPackageJson(folder);
  const realPath = json && tryRealpath(folder);
  if (!json || !realPath) {
    return undefined;
  }

  const existing = byRealPath.get(realPath);
  if (existing) {
    return existing;
  }

  const node: TreeNode = {
    json,
    realPath,
    isProduction: false,
    edges: [],
    installName: installName ?? json.name,
    parent: parent && !lstatSync(folder).isSymbolicLink() ? parent : undefined,
    children: new Map(),
  };
  byRealPath.set(realPath, node);

  for (const name of listInstalled(join(folder, 'node_modules'))) {
    const child = readNode(join(folder, 'node_modules', name), name, node, byRealPath);
    if (child) {
      node.children.set(name, child);
    }
  }

  return node;
}

function resolveEdges(node: TreeNode): PackageNode[] {
  const dependencyNames = Object.keys(node.json.dependencies ?? {});
  const resolved = dependencyNames.flatMap((name) => findDependency(node, name) ?? []);
  const otherChildren = [...node.children]
    .filter(([name]) => !dependencyNames.includes(name))
    .map(([, child]) => child);

  return [...resolved, ...otherChildren];
}

function markProduction(root: TreeNode) {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    node.isProduction = true;

    const { dependencies = {}, peerDependencies = {} } = node.json;
    for (const name of [...Object.keys(dependencies), ...Object.keys(peerDependencies)]) {
      const dependency = findDependency(node, name);
      if (dependency && !dependency.isProduction) {
        pending.push(dependency);
      }
    }
  }
}

function findDependency(from: TreeNode, name: string): TreeNode | undefined {
  for (let node: TreeNode | undefined = from; node; node = node.parent) {
    const found = node.children.get(name) ?? (node.installName === name ? node : undefined);
    if (found) {
      return found;
    }
  }
}

/** `normalize-package-data` merges `optionalDependencies` into `dependencies` and expands repository shorthands. */
function readPackageJson(folder: string): normalizePackageData.Package | undefined {
  try {
    const json = JSON.parse(
      readFileSync(join(folder, 'package.json'), 'utf8').replace(/^\uFEFF/, '')
    );
    json.readme ??= readReadme(folder);
    normalizePackageData(json);
    return json;
  } catch {
    return undefined;
  }
}

/** Prefers a markdown README, then a bare README, then the first match. */
function readReadme(folder: string): string | undefined {
  const files = readdirSafe(folder)
    .filter((file) => /^readme(\..*)?$/i.test(file) && lstatSync(join(folder, file)).isFile())
    .sort((a, b) => a.localeCompare(b, 'en'));
  if (!files.length) {
    return undefined;
  }

  const markdown = files.find((file) => /\.m?a?r?k?d?o?w?n?$/i.test(file));
  const bare = files.findLast((file) => /README$/.test(file));
  return readFileSync(join(folder, markdown ?? bare ?? files[0]), 'utf8');
}

function listInstalled(nodeModules: string): string[] {
  return readdirSafe(nodeModules)
    .filter((name) => !name.startsWith('.'))
    .flatMap((name) =>
      name.startsWith('@')
        ? readdirSafe(join(nodeModules, name))
            .filter((scoped) => !scoped.startsWith('.'))
            .map((scoped) => `${name}/${scoped}`)
        : [name]
    );
}

function readdirSafe(directory: string): string[] {
  try {
    return readdirSync(directory);
  } catch {
    return [];
  }
}

function tryRealpath(folder: string): string | undefined {
  try {
    return realpathSync(folder);
  } catch {
    return undefined;
  }
}
