/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { parse } from 'yaml';

import { readFile } from './util';

const FTR_MANIFESTS_INDEX = '.buildkite/ftr-manifests/ftr_configs_manifests.json';
const FTR_MANIFEST_FILENAME_RE = /ftr_(?<domain>[a-z]+)_(?:stateful|serverless)_configs\.yml$/;

type FtrManifestEntry = string | Record<string, unknown>;

interface FtrManifest {
  enabled?: FtrManifestEntry[];
  disabled?: FtrManifestEntry[];
}

/**
 * Reads every FTR manifest and returns each listed config (repo-relative, enabled or disabled)
 * mapped to the manifest domains (`ftr_{domain}_{arch}_configs.yml`) that list it.
 */
export function readFtrConfigDomains(repoRoot: string): Map<string, Set<string>> {
  const manifestPaths: Record<string, string[]> = JSON.parse(
    readFile(path.resolve(repoRoot, FTR_MANIFESTS_INDEX))
  );
  const domainsByConfig = new Map<string, Set<string>>();

  for (const manifestPath of Object.values(manifestPaths).flat()) {
    const domain = manifestPath.match(FTR_MANIFEST_FILENAME_RE)?.groups?.domain;
    if (!domain) {
      throw new Error(
        `FTR manifest '${manifestPath}' does not match 'ftr_{domain}_{arch}_configs.yml'`
      );
    }

    const { enabled = [], disabled = [] }: FtrManifest =
      parse(readFile(path.resolve(repoRoot, manifestPath))) ?? {};

    for (const entry of [...enabled, ...disabled]) {
      const configPath = typeof entry === 'string' ? entry : Object.keys(entry)[0];
      const domains = domainsByConfig.get(configPath) ?? new Set<string>();
      domains.add(domain);
      domainsByConfig.set(configPath, domains);
    }
  }

  return domainsByConfig;
}
