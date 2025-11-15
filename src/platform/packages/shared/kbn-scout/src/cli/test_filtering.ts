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

export interface PlaywrightTestJson {
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
const extractSpecsFromSuites = (suites: PlaywrightSuite[]): PlaywrightTestJson[] => {
  const specs: PlaywrightTestJson[] = [];

  for (const suite of suites) {
    // Add specs from this suite
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

  // Try to extract NDJSON lines (each line is a JSON object)
  // This is the most common format for Playwright --list --reporter=json
  const lines = trimmed.split('\n');
  const jsonLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      continue;
    }

    // Skip lines that are clearly not JSON (error messages, warnings, etc.)
    if (
      trimmedLine.startsWith('Error') ||
      trimmedLine.startsWith('Warning') ||
      trimmedLine.startsWith('Using') ||
      trimmedLine.toLowerCase().includes('error:') ||
      trimmedLine.toLowerCase().includes('warning:')
    ) {
      continue;
    }

    // Try to parse the line as JSON
    if (trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) {
      try {
        JSON.parse(trimmedLine);
        jsonLines.push(trimmedLine);
      } catch {
        // Not valid JSON, skip this line
      }
    }
  }

  if (jsonLines.length > 0) {
    // If we have multiple JSON objects, combine them into an array
    if (jsonLines.length === 1 && jsonLines[0].startsWith('[')) {
      return jsonLines[0];
    }
    // Combine individual JSON objects into an array
    try {
      const parsedLines = jsonLines.map((line) => JSON.parse(line));
      return JSON.stringify(parsedLines);
    } catch {
      // If combining fails, return null
      return null;
    }
  }

  // Last resort: try to find JSON array or object using regex
  // Try to find a complete JSON object by matching braces
  let braceCount = 0;
  let startIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{') {
      if (startIndex === -1) {
        startIndex = i;
      }
      braceCount++;
    } else if (trimmed[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIndex !== -1) {
        const jsonCandidate = trimmed.substring(startIndex, i + 1);
        try {
          JSON.parse(jsonCandidate);
          return jsonCandidate;
        } catch {
          // Not valid JSON, continue searching
          startIndex = -1;
        }
      }
    }
  }

  // Try regex for JSON array
  const jsonArrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    try {
      JSON.parse(jsonArrayMatch[0]);
      return jsonArrayMatch[0];
    } catch {
      // Not valid JSON
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
): PlaywrightTestJson[] | null => {
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

    // Parse the JSON - handle Playwright's list output format
    let tests: PlaywrightTestJson[] = [];

    try {
      const parsed = JSON.parse(jsonContent) as PlaywrightListOutput | PlaywrightTestJson[];

      // Check if it's the Playwright list output format (object with suites)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'suites' in parsed) {
        const playwrightOutput = parsed as PlaywrightListOutput;
        if (playwrightOutput.suites && Array.isArray(playwrightOutput.suites)) {
          // Extract all specs from nested suites structure
          tests = extractSpecsFromSuites(playwrightOutput.suites);
        }
      } else if (Array.isArray(parsed)) {
        // Standard JSON array format (legacy or alternative format)
        tests = parsed;
      } else if (parsed && typeof parsed === 'object' && 'title' in parsed && 'ok' in parsed) {
        // Single test object
        tests = [parsed as PlaywrightTestJson];
      } else {
        log.warning(
          `Unexpected JSON format for ${configPath}. Expected Playwright list output or array of tests.`
        );
        return null;
      }
    } catch (parseError) {
      log.error(
        `Failed to parse JSON for ${configPath}: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }. JSON content preview: ${jsonContent.substring(0, 500)}`
      );
      return null;
    }

    return tests;
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
 * Checks if any test in the provided array has a matching tag and at least one non-skipped test
 * A test is considered runnable if it has at least one test run with expectedStatus: "passed"
 */
const hasMatchingTagInTests = (tests: PlaywrightTestJson[], tag: string): boolean => {
  return tests.some((test) => {
    // Check if test has the matching tag
    if (!test.tags || !Array.isArray(test.tags) || !test.tags.includes(tag)) {
      return false;
    }

    // If test has no tests array, consider it as runnable (legacy format)
    if (!test.tests || test.tests.length === 0) {
      return true;
    }

    // Check if at least one test has expectedStatus: "passed"
    // This indicates the test is expected to run
    return test.tests.some((t) => t.expectedStatus === 'passed');
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
 * Returns a structure organized by server mode -> group -> { tag, configs }
 */
export const filterConfigsWithTests = (
  scoutConfigs: Map<string, any>,
  log: ToolingLog
): Record<string, Record<string, { tag: string; configs: string[] }>> => {
  const startTime = Date.now();
  log.info('Filtering Playwright configs to only those with tests...');

  // Structure: serverMode -> group -> { tag, configs }
  const result: Record<string, Record<string, { tag: string; configs: string[] }>> = {};

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
        log.info(`Checking config: '${pwConfigPath}'`);
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
      const tests = parsePlaywrightOutput(output, pwConfigPath, log);
      if (!tests) {
        continue;
      }

      // Check all tags
      const foundTags = new Set<string>();
      for (const tag of tags) {
        const hasTag = hasMatchingTagInTests(tests, tag);
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

          // Initialize structure if needed
          if (!result[serverMode]) {
            result[serverMode] = {};
          }
          if (!result[serverMode][group]) {
            result[serverMode][group] = {
              tag: pwGrepTag,
              configs: [],
            };
          }

          // Add config if not already present
          // Note: tag is set on first initialization and not overwritten
          // This ensures consistent tag per group+serverMode combination
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
      log.info(`  Group: ${group}, Tag: ${entry.tag}, Configs: ${entry.configs.length}`);
      entry.configs.forEach((config) => log.info(`    - ${config}`));
    });
  });

  return result;
};
