/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface PnpmField {
  onlyBuiltDependencies?: string[];
  ignoredBuiltDependencies?: string[];
  overrides?: Record<string, string>;
}

// Keep in sync with INSTALL_SETTINGS in
// src/dev/kbn_pm/src/commands/bootstrap/regenerate_pnpm_workspace.mjs — the
// canonical dev-side generator. Both mirror package.json "pnpm" into the
// pnpm-workspace.yaml that pnpm 11 actually reads.
const INSTALL_SETTINGS = [
  'nodeLinker: hoisted',
  "hoistPattern:\n  - '*'",
  "publicHoistPattern:\n  - '*'",
  'shamefullyHoist: true',
  'autoInstallPeers: true',
  'strictPeerDependencies: false',
  'dedupePeerDependents: true',
].join('\n');

/**
 * Renders the settings-only pnpm-workspace.yaml written into the distributable
 * build dir. No `packages:` block — it exists purely to carry install settings,
 * the build allowlist and overrides for the standalone in-build install.
 */
export function renderPnpmWorkspace(pnpm: PnpmField = {}): string {
  const blocks = [INSTALL_SETTINGS];

  const allowBuilds = new Map<string, boolean>();
  for (const name of pnpm.onlyBuiltDependencies ?? []) allowBuilds.set(name, true);
  for (const name of pnpm.ignoredBuiltDependencies ?? []) allowBuilds.set(name, false);
  if (allowBuilds.size) {
    const entries = [...allowBuilds.keys()].sort();
    blocks.push(
      ['allowBuilds:', ...entries.map((name) => `  ${yaml(name)}: ${allowBuilds.get(name)}`)].join(
        '\n'
      )
    );
  }

  const overrides = pnpm.overrides ?? {};
  const overrideKeys = Object.keys(overrides).sort();
  if (overrideKeys.length) {
    blocks.push(
      ['overrides:', ...overrideKeys.map((k) => `  ${yaml(k)}: ${yaml(overrides[k])}`)].join('\n')
    );
  }

  return `${blocks.join('\n')}\n`;
}

// Single-quote keys/values: override keys/values carry @, >, <, :, $ and spaces
// that YAML would otherwise mis-parse. Only ' needs escaping inside.
function yaml(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}
