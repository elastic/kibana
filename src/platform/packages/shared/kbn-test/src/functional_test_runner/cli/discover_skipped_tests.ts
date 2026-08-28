/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import Path from 'node:path';
import { promisify } from 'node:util';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { testConfigs } from '@kbn/scout-reporting';
import type { ToolingLog } from '@kbn/tooling-log';
import { FunctionalTestRunner } from '../functional_test_runner';
import { EsVersion, readConfigFile } from '../lib';
import { getAllFtrConfigsAndManifests } from '../lib/config/ftr_configs_manifest';

const nodeRequire = createRequire(__filename);
const execFileAsync = promisify(execFile);

export interface SkippedTest {
  id: string;
  framework: 'ftr' | 'scout';
  config: string;
  target: string;
  file: string;
  suite: string;
  test: string;
  line?: number;
  state: 'skipped';
}

export interface UnavailableConfig {
  framework: 'ftr' | 'scout';
  config: string;
  error: string;
}

export interface SkippedTestsManifest {
  version: 1;
  revision: string;
  complete: boolean;
  tests: SkippedTest[];
  unavailableConfigs: UnavailableConfig[];
}

interface PlaywrightTest {
  expectedStatus: string;
  projectId: string;
}

interface PlaywrightSpec {
  title: string;
  file: string;
  line: number;
  tests: PlaywrightTest[];
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightListReport {
  config: { rootDir: string };
  suites: PlaywrightSuite[];
}

export const createSkippedTestId = (file: string, suite: string, test: string): string =>
  `${file}::${suite}::${test}`;

const getRevision = (): string =>
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

export const parseSkippedScoutTests = (
  config: string,
  report: PlaywrightListReport
): SkippedTest[] => {
  const skippedTests: SkippedTest[] = [];

  const visitSuites = (suites: PlaywrightSuite[], parentTitles: string[] = []): void => {
    for (const suite of suites) {
      const isFileSuite = suite.file !== undefined && suite.title === Path.basename(suite.file);
      const suiteTitles = isFileSuite ? parentTitles : [...parentTitles, suite.title];

      for (const spec of suite.specs ?? []) {
        const file = Path.relative(REPO_ROOT, Path.resolve(report.config.rootDir, spec.file));
        const suiteTitle = suiteTitles.join(' > ');
        for (const test of spec.tests) {
          if (test.expectedStatus !== 'skipped') {
            continue;
          }

          skippedTests.push({
            id: createSkippedTestId(file, suiteTitle, spec.title),
            framework: 'scout',
            config,
            target: test.projectId,
            file,
            suite: suiteTitle,
            test: spec.title,
            line: spec.line,
            state: 'skipped',
          });
        }
      }

      visitSuites(suite.suites ?? [], suiteTitles);
    }
  };

  visitSuites(report.suites);
  return skippedTests;
};

export const discoverSkippedScoutTests = async (
  log: ToolingLog
): Promise<{ skippedTests: SkippedTest[]; unavailableConfigs: UnavailableConfig[] }> => {
  const skippedTests: SkippedTest[] = [];
  const unavailableConfigs: UnavailableConfig[] = [];
  // Discovery must not depend on a manifest's prior skip count: a stale manifest from a
  // newly skipped config would otherwise omit the test entirely.
  for (const config of testConfigs.all) {
    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        ['scripts/playwright', 'test', '--list', '--reporter=json', '--config', config.path],
        { cwd: REPO_ROOT, maxBuffer: 50 * 1024 * 1024 }
      );
      skippedTests.push(
        ...parseSkippedScoutTests(config.path, JSON.parse(stdout) as PlaywrightListReport)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      unavailableConfigs.push({ framework: 'scout', config: config.path, error: message });
      log.warning(`Unable to discover skipped tests in Scout config ${config.path}: ${message}`);
    }
  }

  return { skippedTests, unavailableConfigs };
};

export const discoverSkippedFtrTests = async (
  log: ToolingLog
): Promise<{ skippedTests: SkippedTest[]; unavailableConfigs: UnavailableConfig[] }> => {
  const { ftrConfigEntries } = getAllFtrConfigsAndManifests();
  const skippedTests: SkippedTest[] = [];
  const unavailableConfigs: UnavailableConfig[] = [];
  const esVersion = EsVersion.getDefault();

  for (const configPath of ftrConfigEntries.keys()) {
    const config = Path.relative(REPO_ROOT, configPath);
    try {
      const configExports = nodeRequire(configPath);
      const configProvider = configExports.__esModule ? configExports.default : configExports;
      if (typeof configProvider !== 'function') {
        continue;
      }

      const ftrConfig = await readConfigFile(log, esVersion, configPath);
      const testFiles = ftrConfig.get('testFiles') as string[] | undefined;
      if (
        ftrConfig.get('testRunner') ||
        ftrConfig.module.type === 'journey' ||
        !testFiles ||
        testFiles.length === 0
      ) {
        continue;
      }

      const runner = new FunctionalTestRunner(log, ftrConfig, esVersion);
      skippedTests.push(
        ...(await runner.getSkippedTests()).map((test) => {
          const file = Path.relative(REPO_ROOT, test.file);
          return {
            id: createSkippedTestId(file, test.suite, test.test),
            framework: 'ftr' as const,
            config,
            target: config,
            ...test,
            file,
            state: 'skipped' as const,
          };
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      unavailableConfigs.push({ framework: 'ftr', config, error: message });
      log.warning(`Unable to discover skipped tests in FTR config ${config}: ${message}`);
    }
  }

  return { skippedTests, unavailableConfigs };
};

export const discoverSkippedTests = async (log: ToolingLog): Promise<SkippedTestsManifest> => {
  const [scout, ftr] = await Promise.all([
    discoverSkippedScoutTests(log),
    discoverSkippedFtrTests(log),
  ]);
  const unavailableConfigs = [...scout.unavailableConfigs, ...ftr.unavailableConfigs];

  return {
    version: 1,
    revision: getRevision(),
    complete: unavailableConfigs.length === 0,
    tests: [...scout.skippedTests, ...ftr.skippedTests],
    unavailableConfigs,
  };
};

export async function runDiscoverSkippedTestsCli(): Promise<void> {
  await run(
    async ({ flagsReader, log }) => {
      const manifest = await discoverSkippedTests(log);
      const output = flagsReader.path('output') ?? 'target/skipped-tests-manifest.json';

      mkdirSync(Path.dirname(output), { recursive: true });
      writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
      log.info(
        `Wrote ${manifest.tests.length} skipped tests and ${manifest.unavailableConfigs.length} unavailable configs to ${output}`
      );
    },
    {
      description: 'Generate a versioned manifest of source-level skipped Scout and FTR tests',
      flags: {
        string: ['output'],
        default: { output: 'target/skipped-tests-manifest.json' },
        help: `
          --output <path>  Manifest path [default: target/skipped-tests-manifest.json]
        `,
      },
    }
  );
}
