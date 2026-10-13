/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative, resolve } from 'path';

import { readPackageTree, type PackageNode } from './package_tree';
import { detectLicenses } from './detect_licenses';

export interface InstalledPackage {
  name: string;
  version: string;
  isDevOnly: boolean;
  repository?: string;
  directory: string;
  relative: string;
  licenses: string[];
}

interface Options {
  directory: string;
  includeDev?: boolean;
  licenseOverrides?: { [pgkNameAndVersion: string]: string[] };
}

/**
 *  Get a list of objects with details about each installed
 *  NPM package.
 */
export async function getInstalledPackages(options: Options): Promise<InstalledPackage[]> {
  const root = readPackageTree(options.directory);
  return [
    ...collectPackages(root, false, options),
    ...(options.includeDev ? collectPackages(root, true, options) : []),
  ];
}

/**
 * Production packages are those reachable from the root through `dependencies`,
 * `optionalDependencies` and `peerDependencies`; dev packages are everything else installed.
 */
function collectPackages(root: PackageNode, dev: boolean, options: Options): InstalledPackage[] {
  const byKey = new Map<string, PackageNode>();
  const pending = [root];

  while (pending.length) {
    const node = pending.pop()!;
    const key = `${node.json.name}@${node.json.version}`;
    const isIncluded = node === root || node.isProduction !== dev;
    if (byKey.has(key) || !isIncluded) {
      continue;
    }

    byKey.set(key, node);
    pending.push(...[...node.edges].reverse());
  }

  return [...byKey.entries()]
    .filter(
      ([key, node]) =>
        node !== root && node.json.name && node.json.version && !key.startsWith('@kbn/')
    )
    .sort(([a], [b]) => (a < b ? -1 : Number(a > b)))
    .map(([key, node]) => toInstalledPackage(key, node, dev, options));
}

function toInstalledPackage(
  key: string,
  { json, realPath }: PackageNode,
  dev: boolean,
  options: Options
): InstalledPackage {
  const name = json.name;
  const override = options.licenseOverrides?.[key] ?? options.licenseOverrides?.[name];

  return {
    name,
    version: json.version,
    isDevOnly: dev,
    repository: normalizeRepositoryUrl(json.repository),
    directory: realPath,
    relative: relative(options.directory, realPath),
    licenses: override ?? resolveLicenses(json.private === true, realPath, json),
  };
}

function resolveLicenses(isPrivate: boolean, directory: string, json: PackageNode['json']) {
  if (!isPrivate) {
    return detectLicenses(directory, json);
  } else if (typeof json.license === 'string' && json.license) {
    return [json.license];
  } else {
    throw new Error(
      `Unable to detect license for \`"private": true\` package at ${resolve(directory)}`
    );
  }
}

function normalizeRepositoryUrl(repository: PackageNode['json']['repository']) {
  if (typeof repository !== 'object' || typeof repository.url !== 'string') {
    return undefined;
  }

  return repository.url
    .replace('git+ssh://git@', 'git://')
    .replace('git+https://github.com', 'https://github.com')
    .replace('git://github.com', 'https://github.com')
    .replace('git@github.com:', 'https://github.com/')
    .replace(/\.git$/, '');
}
