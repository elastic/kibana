/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { execSync } from 'child_process';
import { getPlaywrightGrepTag } from '../playwright/utils';
import type { CliSupportedServerModes } from '../types';

/**
 * Playwright test spec extracted from the list output
 * A spec is a single test case (test() call) that can be run across multiple projects.
 */
export interface ExtractedPlaywrightSpec {
  /** The test spec title */
  title: string;
  /** The test spec is valid/ok (not skipped or invalid) */
  ok: boolean;
  /** Tags inherited from the parent describe block */
  tags?: string[];
  /** Array of test runs, one per project (e.g., local, ech, mki) */
  tests?: Array<{
    timeout: number;
    annotations?: Array<{ type?: string; [key: string]: unknown }>;
    expectedStatus: string;
    projectId: string;
    projectName: string;
    results: unknown[];
    status: string;
  }>;
}

interface PlaywrightSpec {
  title: string;
  ok: boolean;
  tags?: string[];
  tests?: Array<{
    timeout: number;
    annotations?: Array<{ type?: string; [key: string]: unknown }>;
    expectedStatus: string;
    projectId: string;
    projectName: string;
    results: unknown[];
    status: string;
  }>;
  id?: string;
  file?: string;
  line?: number;
  column?: number;
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  line?: number;
  column?: number;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightListOutput {
  config?: unknown;
  suites?: PlaywrightSuite[];
  errors?: unknown[];
  stats?: unknown;
}

/**
 * Recursively extracts all specs from nested suites structure
 */
const extractSpecsFromSuites = (suites: PlaywrightSuite[]): ExtractedPlaywrightSpec[] => {
  const specs: ExtractedPlaywrightSpec[] = [];

  for (const suite of suites) {
    // Add specs from each suite
    if (suite.specs) {
      for (const spec of suite.specs) {
        specs.push({
          title: spec.title,
          ok: spec.ok,
          tags: spec.tags,
          tests: spec.tests,
        });
      }
    }

    // Recursively process nested suites
    if (suite.suites) {
      specs.push(...extractSpecsFromSuites(suite.suites));
    }
  }

  return specs;
};

/**
 * Extracts JSON content from Playwright output string
 * Playwright outputs clean JSON, but may have error messages in it
 */
const extractJsonFromOutput = (output: string): string | null => {
  const trimmed = output.trim();
  if (!trimmed) {
    return null;
  }

  // Try to parse as-is if it's a JSON array or object
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Not valid JSON, continue with extraction
    }
  }

  // Extract JSON object/array from output that may contain error messages
  // Find the first complete JSON object or array by matching braces/brackets
  let braceCount = 0;
  let bracketCount = 0;
  let startIndex = -1;
  let isObject = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '{') {
      if (startIndex === -1) {
        startIndex = i;
        isObject = true;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1 && isObject) {
        const jsonCandidate = trimmed.substring(startIndex, i + 1);
        try {
          JSON.parse(jsonCandidate);
          return jsonCandidate;
        } catch {
          startIndex = -1;
        }
      }
    } else if (char === '[') {
      if (startIndex === -1) {
        startIndex = i;
        isObject = false;
      }
      bracketCount++;
    } else if (char === ']') {
      bracketCount--;
      if (bracketCount === 0 && startIndex !== -1 && !isObject) {
        const jsonCandidate = trimmed.substring(startIndex, i + 1);
        try {
          JSON.parse(jsonCandidate);
          return jsonCandidate;
        } catch {
          startIndex = -1;
        }
      }
    }
  }

  return null;
};

/**
 * Parses Playwright JSON output and extracts all test specs in memory
 */
const parsePlaywrightOutput = (
  jsonOutput: string,
  configPath: string,
  log: ToolingLog
): ExtractedPlaywrightSpec[] | null => {
  try {
    // Extract JSON content from output (may contain non-JSON content)
    const jsonContent = extractJsonFromOutput(jsonOutput);

    if (!jsonContent) {
      log.warning(
        `No valid JSON found in Playwright output for ${configPath}. Output preview: ${jsonOutput.substring(
          0,
          200
        )}`
      );
      return null;
    }

    try {
      const parsed = JSON.parse(jsonContent) as PlaywrightListOutput;

      // Playwright --list --reporter=json always outputs an object with 'suites'
      if (parsed?.suites && Array.isArray(parsed.suites)) {
        return extractSpecsFromSuites(parsed.suites);
      }

      log.warning(
        `Unexpected JSON format for ${configPath}. Expected Playwright list output with 'suites' array.`
      );
      return null;
    } catch (parseError) {
      log.error(
        `Failed to parse JSON for ${configPath}: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }. JSON content preview: ${jsonContent.substring(0, 200)}`
      );
      return null;
    }
  } catch (error) {
    log.error(
      `Failed to parse Playwright output for ${configPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
};

/**
 * Checks if any spec in the provided array has a matching tag and at least one runnable test run
 */
const hasMatchingTagInSpecs = (specs: ExtractedPlaywrightSpec[], tag: string): boolean => {
  return specs.some((spec) => {
    // Every describe block in Scout must have tags
    if (!spec.tags || !Array.isArray(spec.tags) || !spec.tags.includes(tag)) {
      return false;
    }

    // Spec must have a tests array with at least one runnable test run
    if (!spec.tests || spec.tests.length === 0) {
      return false;
    }

    // Check if at least one test run has expectedStatus: "passed"
    // This indicates the spec is expected to run
    return spec.tests.some((testRun) => testRun.expectedStatus === 'passed');
  });
};

/**
 * Normalizes server mode from runMatrixEntry
 * Converts 'serverless=es', 'serverless=security', etc to 'serverless'
 * Keeps 'stateful' as is
 */
const normalizeServerMode = (runMatrixEntry: CliSupportedServerModes): string => {
  if (runMatrixEntry === 'stateful') {
    return 'stateful';
  }
  // All serverless variants become 'serverless'
  return 'serverless';
};

/**
 * Filters Playwright configs to only those with tests matching specific tags
 * Returns a structure organized by server mode -> group -> { project, tag, configs }
 * The output format is designed to easily build Playwright commands:
 *   npx playwright test --project=<project> --grep=<tag> --config=<config>
 */
export const filterConfigsWithTests = (
  scoutConfigs: Map<string, any>,
  log: ToolingLog
): Record<string, Record<string, { project: string; tag: string; configs: string[] }>> => {
  const startTime = Date.now();
  log.info('Filtering Playwright configs to only those with tests...');

  // Structure: serverMode -> group -> { project, tag, configs }
  const result: Record<
    string,
    Record<string, { project: string; tag: string; configs: string[] }>
  > = {};

  const testRunMatrix: Record<string, CliSupportedServerModes[]> = {
    platform: ['serverless=es', 'serverless=security', 'serverless=oblt', 'stateful'],
    observability: ['serverless=oblt', 'stateful'],
    security: ['serverless=security', 'stateful'],
    search: ['serverless=es', 'stateful'],
  };

  const tags = ['svlSecurity', 'svlOblt', 'svlSearch', 'ess'];

  // Map tags to their corresponding runMatrixEntry for grouping
  const tagToRunMatrixMap: Record<string, CliSupportedServerModes[]> = {
    svlSecurity: ['serverless=security', 'stateful'],
    svlOblt: ['serverless=oblt', 'stateful'],
    svlSearch: ['serverless=es', 'stateful'],
    ess: ['serverless=es', 'serverless=security', 'serverless=oblt', 'stateful'],
  };

  for (const module of scoutConfigs.entries()) {
    const [, data] = module;
    const moduleRunMatrix = testRunMatrix[data.group as keyof typeof testRunMatrix];

    for (const pwConfigPath of data.configs) {
      // Run Playwright once per config (not once per runMatrixEntry)
      let output = '';
      try {
        log.debug(`Checking config: '${pwConfigPath}'`);
        output = execSync(`npx playwright test --list --config ${pwConfigPath} --reporter=json`, {
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024 * 10,
        });
      } catch (execError: any) {
        // execSync throws on non-zero exit codes, but might still have JSON output
        // Try to extract output from the error object
        if (execError.stdout) {
          output =
            typeof execError.stdout === 'string' ? execError.stdout : execError.stdout.toString();
        } else if (execError.output && execError.output[1]) {
          output =
            typeof execError.output[1] === 'string'
              ? execError.output[1]
              : execError.output[1].toString();
        } else {
          // If no stdout, log the error and continue to next config
          log.warning(
            `Playwright command failed for ${pwConfigPath}: ${execError.message}. Skipping...`
          );
          continue;
        }
      }

      // Parse the JSON output once in memory
      const specs = parsePlaywrightOutput(output, pwConfigPath, log);
      if (!specs) {
        continue;
      }

      // Check all tags
      const foundTags = new Set<string>();
      for (const tag of tags) {
        const hasTag = hasMatchingTagInSpecs(specs, tag);
        if (hasTag) {
          foundTags.add(tag);
        }
      }

      // Map found tags to their corresponding runMatrixEntries and pwGrepTags
      for (const tag of foundTags) {
        const runMatrixEntries = tagToRunMatrixMap[tag] || [];
        // Only include entries that are in the module's run matrix
        const relevantEntries = runMatrixEntries.filter((entry) => moduleRunMatrix.includes(entry));

        for (const runMatrixEntry of relevantEntries) {
          const pwGrepTag = getPlaywrightGrepTag(runMatrixEntry);
          const serverMode = normalizeServerMode(runMatrixEntry);
          const group = data.group as string;

          // Skip platform group for serverless mode
          // Serverless should only have solutions: search, security, observability, etc.
          if (serverMode === 'serverless' && group === 'platform') {
            continue;
          }

          // Determine the Playwright project name based on server mode
          // For cloud runs: stateful -> 'ech', serverless -> 'mki'
          const project = serverMode === 'stateful' ? 'ech' : 'mki';

          // Initialize structure if needed
          if (!result[serverMode]) {
            result[serverMode] = {};
          }
          if (!result[serverMode][group]) {
            result[serverMode][group] = {
              project,
              tag: pwGrepTag,
              configs: [],
            };
          }

          // Add config if not already present
          // Note: project and tag are set on first initialization and not overwritten
          // This ensures consistent project and tag per group+serverMode combination
          if (!result[serverMode][group].configs.includes(pwConfigPath)) {
            result[serverMode][group].configs.push(pwConfigPath);
          }
        }
      }
    }
  }

  const endTime = Date.now();
  const durationSecs = ((endTime - startTime) / 1000).toFixed(2);
  log.info(
    `Filtering completed in ${durationSecs} seconds. Playwright configs with tests filtered.`
  );

  log.info('Playwright configs with tests found (organized by server mode and group):');
  Object.entries(result).forEach(([serverMode, groups]) => {
    log.info(`Server Mode: ${serverMode}`);
    Object.entries(groups).forEach(([group, entry]) => {
      log.info(
        `  Group: ${group}, Project: ${entry.project}, Tag: ${entry.tag}, Configs: ${entry.configs.length}`
      );
      entry.configs.forEach((config) => log.info(`    - ${config}`));
    });
  });

  return result;
};
