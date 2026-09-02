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
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { readConfigFile } from './config_loading';
import { EsVersion } from '../es_version';
import { FunctionalTestRunner } from '../../functional_test_runner';

const OUTPUT_REL = '.buildkite/ftr_config_test_files.json';
const MANIFEST_INDEX_REL = '.buildkite/ftr-manifests/ftr_configs_manifests.json';

/**
 * Shape of `.buildkite/ftr_config_test_files.json`, the spec->config index used by
 * selective testing to narrow FTR to the configs that own a changed spec.
 *
 * - `configs`: repo-relative config path -> sorted repo-relative test files it loads.
 * - `customRunners`: enabled configs whose files can't be introspected (custom
 *   `testRunner`, e.g. journeys). Consumers must treat their specs as unknown and
 *   fall back to running all FTR.
 */
export interface FtrConfigTestFilesIndex {
  configs: Record<string, string[]>;
  customRunners: string[];
}

/**
 * Generate the FTR spec->config index by loading enabled configs (no ES/Kibana boot)
 * and recording the test files each one would run. A full run (no `--config`) rewrites
 * the whole index and fails if any enabled config errors, so a committed artifact is
 * always complete. `--config <relPath>` regenerates a subset and merges into the
 * existing file for fast local iteration.
 */
export async function runFtrConfigTestFilesCli() {
  run(
    async ({ flagsReader, log }) => {
      const subset = flagsReader.arrayOfStrings('config') ?? [];
      const isSubset = subset.length > 0;
      const enabled = readEnabledConfigRelPaths();
      const targets = isSubset ? enabled.filter((rel) => subset.includes(rel)) : enabled;

      if (isSubset && targets.length !== subset.length) {
        const missing = subset.filter((rel) => !enabled.includes(rel));
        throw createFailError(
          `--config paths not found in enabled FTR manifests:\n - ${missing.join('\n - ')}`
        );
      }

      const esVersion = EsVersion.getDefault();
      const configs: Record<string, string[]> = {};
      const customRunners: string[] = [];
      const failures: Array<{ rel: string; message: string }> = [];

      for (const rel of targets) {
        const abs = Path.resolve(REPO_ROOT, rel);
        try {
          const config = await readConfigFile(log, esVersion, abs);
          const runner = new FunctionalTestRunner(log, config, esVersion);
          const files = await runner.getTestFiles();

          if (files === undefined) {
            customRunners.push(rel);
            log.info(`custom testRunner, no introspectable files: ${rel}`);
            continue;
          }

          configs[rel] = files.map((abs2) => Path.relative(REPO_ROOT, abs2)).sort();
        } catch (error) {
          failures.push({ rel, message: error.message });
          log.error(`Failed to load FTR config ${rel}: ${error.message}`);
        }
      }

      if (failures.length > 0) {
        throw createFailError(
          `Could not introspect ${failures.length} FTR config(s); the index would be incomplete. ` +
            `Fix these configs (or remove them from the manifests) and retry:\n - ${failures
              .map((f) => f.rel)
              .join('\n - ')}`
        );
      }

      const output = buildOutput({ configs, customRunners, isSubset });
      const outPath = Path.resolve(REPO_ROOT, OUTPUT_REL);
      Fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
      log.success(
        `Wrote ${Object.keys(output.configs).length} configs (${
          output.customRunners.length
        } custom runners) to ${OUTPUT_REL}`
      );
    },
    {
      description:
        'Generate the FTR spec->config index (.buildkite/ftr_config_test_files.json) for selective testing',
      flags: {
        string: ['config'],
        help: `
          --config=path  regenerate only this enabled config (repo-relative), merging into the
                         existing index. Pass multiple times. Omit to regenerate the whole index.
        `,
      },
    }
  );
}

function buildOutput({
  configs,
  customRunners,
  isSubset,
}: {
  configs: Record<string, string[]>;
  customRunners: string[];
  isSubset: boolean;
}): FtrConfigTestFilesIndex {
  if (!isSubset) {
    return { configs: sortKeys(configs), customRunners: [...customRunners].sort() };
  }

  const existing = readExistingIndex();
  const mergedConfigs = { ...existing.configs, ...configs };
  const mergedCustom = new Set([
    // drop regenerated paths from the old custom list, re-add only if still custom
    ...existing.customRunners.filter((rel) => !(rel in configs)),
    ...customRunners,
  ]);
  return { configs: sortKeys(mergedConfigs), customRunners: [...mergedCustom].sort() };
}

function readExistingIndex(): FtrConfigTestFilesIndex {
  try {
    const raw = Fs.readFileSync(Path.resolve(REPO_ROOT, OUTPUT_REL), 'utf8');
    const parsed = JSON.parse(raw) as Partial<FtrConfigTestFilesIndex>;
    return { configs: parsed.configs ?? {}, customRunners: parsed.customRunners ?? [] };
  } catch {
    return { configs: {}, customRunners: [] };
  }
}

function sortKeys(obj: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.keys(obj)
      .sort()
      .map((key) => [key, obj[key]])
  );
}

/** Repo-relative paths of every config listed under `enabled` across the FTR manifests. */
function readEnabledConfigRelPaths(): string[] {
  const indexPath = Path.resolve(REPO_ROOT, MANIFEST_INDEX_REL);
  const manifestRelPaths: { stateful: string[]; serverless: string[] } = JSON.parse(
    Fs.readFileSync(indexPath, 'utf8')
  );

  const enabled = new Set<string>();
  for (const manifestRel of [...manifestRelPaths.stateful, ...manifestRelPaths.serverless]) {
    const manifest = parse(Fs.readFileSync(Path.resolve(REPO_ROOT, manifestRel), 'utf8')) as {
      enabled?: Array<string | Record<string, unknown>>;
    };
    for (const entry of manifest.enabled ?? []) {
      enabled.add(typeof entry === 'string' ? entry : Object.keys(entry)[0]);
    }
  }

  return [...enabled].sort();
}
