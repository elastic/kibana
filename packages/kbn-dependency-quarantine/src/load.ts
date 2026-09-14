/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { minimatch } from 'minimatch';
import { REPO_ROOT } from '@kbn/repo-info';

export interface QuarantineConfig {
  name: string;
  reason: string;
  allowed: string[];
}

export const DEFAULT_CONFIGS_DIR = Path.join(
  REPO_ROOT,
  'packages/kbn-dependency-quarantine/configs'
);

export function matchQuarantinedPackage(
  specifier: string,
  packages: QuarantineConfig[]
): QuarantineConfig | undefined {
  return packages.find((pkg) => specifier === pkg.name || specifier.startsWith(`${pkg.name}/`));
}

export function isPathAllowed(repoRelPath: string, allowed: string[]): boolean {
  const normalized = repoRelPath.split(Path.sep).join('/');
  return allowed.some((pattern) => minimatch(normalized, pattern, { dot: true }));
}

export function formatQuarantineMessage(config: QuarantineConfig): string {
  return (
    `'${config.name}' is quarantined. ${config.reason} ` +
    `To add a new use, add a file or glob to packages/kbn-dependency-quarantine/configs/ ` +
    `and request review from @elastic/kibana-security.`
  );
}

function isQuarantineConfig(value: unknown): value is QuarantineConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<QuarantineConfig>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.reason === 'string' &&
    Array.isArray(candidate.allowed) &&
    candidate.allowed.every((entry) => typeof entry === 'string')
  );
}

export function loadQuarantineConfigs(
  configsDir: string = DEFAULT_CONFIGS_DIR
): QuarantineConfig[] {
  if (!Fs.existsSync(configsDir)) {
    throw new Error(`Quarantine config directory not found: ${configsDir}`);
  }

  return Fs.readdirSync(configsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const abs = Path.join(configsDir, file);
      const parsed: unknown = JSON.parse(Fs.readFileSync(abs, 'utf8'));
      if (!isQuarantineConfig(parsed)) {
        throw new Error(
          `Invalid quarantine config ${abs}: expected { name, reason, allowed: string[] }`
        );
      }
      return parsed;
    });
}
