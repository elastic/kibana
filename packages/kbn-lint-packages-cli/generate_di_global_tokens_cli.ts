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

import { run } from '@kbn/dev-cli-runner';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Output path for the global tokens registry, relative to the repo root.
 *
 * This file is auto-generated and should be committed.  It serves as a
 * machine-readable index of every cross-plugin DI service in the codebase,
 * useful for documentation, IDE tooling, and startup health checks.
 */
const OUTPUT_PATH = Path.join(
  REPO_ROOT,
  'src/core/packages/di/common/global-tokens.json'
);

interface TokenEntry {
  /** Plugin that calls `publish(token)` to expose this service. */
  providedBy: string | null;
  /** Plugins that declare this token in `globals.consumes`. */
  consumedBy: string[];
}

interface Registry {
  /** ISO timestamp of when this file was last generated. */
  generatedAt: string;
  /** Map of token name → provider / consumer info. */
  tokens: Record<string, TokenEntry>;
  warnings: {
    /**
     * Tokens found in `globals.consumes` of one or more plugins but not
     * declared in `globals.provides` of any plugin.  These may indicate a
     * missing `globals.provides` entry or a token from a disabled plugin.
     */
    orphanConsumers: string[];
    /**
     * Tokens declared in `globals.provides` but never listed in
     * `globals.consumes` of any other plugin.  These may be unused services
     * or simply not yet adopted.
     */
    unused: string[];
  };
}

run(
  async ({ log }) => {
    const packages = getPackages(REPO_ROOT);

    const providedBy = new Map<string, string>(); // token → pluginId
    const consumedBy = new Map<string, Set<string>>(); // token → Set<pluginId>

    for (const pkg of packages) {
      if (!pkg.isPlugin()) continue;

      const pluginId: string = pkg.manifest.plugin.id;
      const globals = pkg.manifest.plugin.globals;

      for (const token of globals?.provides ?? []) {
        if (providedBy.has(token)) {
          log.warning(
            `Token "${token}" is provided by both "${providedBy.get(token)}" and "${pluginId}" — keeping first.`
          );
        } else {
          providedBy.set(token, pluginId);
        }
      }

      for (const token of globals?.consumes ?? []) {
        const existing = consumedBy.get(token);
        if (existing) {
          existing.add(pluginId);
        } else {
          consumedBy.set(token, new Set([pluginId]));
        }
      }
    }

    // Merge the two maps into a single token registry.
    const allTokens = new Set([...providedBy.keys(), ...consumedBy.keys()]);
    const tokens: Record<string, TokenEntry> = {};
    for (const token of [...allTokens].sort()) {
      tokens[token] = {
        providedBy: providedBy.get(token) ?? null,
        consumedBy: [...(consumedBy.get(token) ?? [])].sort(),
      };
    }

    // Compute warnings.
    const orphanConsumers = [...allTokens]
      .filter((t) => !providedBy.has(t) && consumedBy.has(t))
      .sort();
    const unused = [...allTokens]
      .filter((t) => providedBy.has(t) && !consumedBy.has(t))
      .sort();

    const registry: Registry = {
      generatedAt: new Date().toISOString(),
      tokens,
      warnings: { orphanConsumers, unused },
    };

    Fs.writeFileSync(OUTPUT_PATH, JSON.stringify(registry, null, 2) + '\n');
    log.success(`Written: ${Path.relative(REPO_ROOT, OUTPUT_PATH)}`);

    if (orphanConsumers.length) {
      log.warning(
        `Tokens consumed but never provided (possibly from a disabled plugin):\n` +
          orphanConsumers.map((t) => `  - ${t}`).join('\n')
      );
    }
    if (unused.length) {
      log.warning(
        `Tokens provided but not consumed by any plugin:\n` +
          unused.map((t) => `  - ${t}`).join('\n')
      );
    }
  },
  {
    usage: 'node scripts/generate_di_global_tokens',
    description:
      'Collect globals.provides / globals.consumes from all plugin kibana.jsonc files ' +
      'and write src/core/packages/di/common/global-tokens.json.',
  }
);
