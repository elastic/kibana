/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Discover ES|QL Test Coverage Analyzer
 *
 * This script analyzes test files to determine coverage of acceptance criteria
 * defined in docs/discover-esql-workflows.md.
 *
 * Usage:
 *   node scripts/analyze_discover_test_coverage.js [options]
 *
 * Options:
 *   --output <format>   Output format: 'markdown' (default) or 'json'
 *   --verbose           Show all keyword matches for each criteria
 *   --help              Show this help message
 */

import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  // Directories to scan for tests
  testDirectories: [
    // Unit tests
    'src/platform/plugins/shared/discover/public/context_awareness/profile_providers',
    // Platform FTR tests
    'src/platform/test/functional/apps/discover/context_awareness',
    'src/platform/test/functional/apps/discover/esql',
    // Serverless FTR tests
    'x-pack/solutions/observability/test/serverless/functional/test_suites/discover/context_awareness',
    'x-pack/platform/test/serverless/functional/test_suites/discover',
  ],

  // File patterns to include
  testFilePatterns: [/\.test\.tsx?$/, /\.ts$/, /\.tsx$/],

  // Files to exclude
  excludePatterns: [/node_modules/, /\.d\.ts$/, /index\.ts$/],

  // Confidence thresholds
  thresholds: {
    covered: 3, // Exact match or 3+ keyword matches
    partial: 2, // 2+ keyword matches
  },
};

// Acceptance Criteria definitions with keywords for matching
const ACCEPTANCE_CRITERIA = {
  // Logs Profile
  'AC-L001': {
    description: 'Row indicator color by log.level',
    keywords: ['row', 'indicator', 'color', 'log.level', 'level', 'getRowIndicatorProvider'],
    profile: 'logs',
  },
  'AC-L002': {
    description: 'log.level badge cell rendering',
    keywords: ['log.level', 'badge', 'cell', 'render', 'getCellRenderers', 'logLevelBadgeCell'],
    profile: 'logs',
  },
  'AC-L003': {
    description: 'service.name APM linking',
    keywords: ['service.name', 'service', 'apm', 'link', 'cell', 'getCellRenderers'],
    profile: 'logs',
  },
  'AC-L004': {
    description: 'Summary column rendering',
    keywords: ['summary', 'column', 'render', 'message', 'resource', 'getCellRenderers'],
    profile: 'logs',
  },
  'AC-L005': {
    description: 'Degraded docs button',
    keywords: [
      'degraded',
      'docs',
      'button',
      'control',
      'getRowAdditionalLeadingControls',
      'quality',
    ],
    profile: 'logs',
  },
  'AC-L006': {
    description: 'Stacktrace button',
    keywords: [
      'stacktrace',
      'stack',
      'trace',
      'button',
      'control',
      'getRowAdditionalLeadingControls',
    ],
    profile: 'logs',
  },
  'AC-L007': {
    description: 'Single-page pagination',
    keywords: ['pagination', 'single', 'page', 'infinite', 'scroll', 'getDocViewerPaginationMode'],
    profile: 'logs',
  },
  'AC-L008': {
    description: 'Histogram breakdown by log.level',
    keywords: ['histogram', 'breakdown', 'log.level', 'chart', 'getDefaultAppState'],
    profile: 'logs',
  },
  'AC-L009': {
    description: 'Default columns configuration',
    keywords: ['default', 'columns', 'timestamp', 'getDefaultAppState', 'appState'],
    profile: 'logs',
  },
  'AC-L010': {
    description: 'Logs Overview tab',
    keywords: ['logs', 'overview', 'tab', 'flyout', 'getDocViewer'],
    profile: 'logs',
  },
  'AC-L011': {
    description: 'Recommended fields section',
    keywords: ['recommended', 'fields', 'getRecommendedFields'],
    profile: 'logs',
  },

  // Traces Profile
  'AC-T001': {
    description: 'APM sub-profile activation',
    keywords: ['apm', 'traces', 'profile', 'match', 'resolve', 'sub-profile'],
    profile: 'traces',
  },
  'AC-T002': {
    description: 'APM columns configuration',
    keywords: ['apm', 'columns', 'transaction', 'duration', 'trace.id', 'span.id'],
    profile: 'traces',
  },
  'AC-T003': {
    description: 'OTel sub-profile activation',
    keywords: ['otel', 'opentelemetry', 'traces', 'profile', 'match', 'resolve'],
    profile: 'traces',
  },
  'AC-T004': {
    description: 'OTel columns configuration',
    keywords: ['otel', 'columns', 'span', 'kind', 'status'],
    profile: 'traces',
  },
  'AC-T005': {
    description: 'APM chart section',
    keywords: ['apm', 'chart', 'section', 'getChartSection', 'timeseries'],
    profile: 'traces',
  },
  'AC-T006': {
    description: 'OTel chart section',
    keywords: ['otel', 'chart', 'section', 'getChartSection', 'timeseries'],
    profile: 'traces',
  },
  'AC-T007': {
    description: 'Summary column rendering',
    keywords: ['summary', 'column', 'traces', 'render', 'getCellRenderers'],
    profile: 'traces',
  },
  'AC-T008': {
    description: 'service.name APM linking',
    keywords: ['service.name', 'apm', 'link', 'traces'],
    profile: 'traces',
  },
  'AC-T009': {
    description: 'Custom column header tooltip',
    keywords: ['column', 'header', 'tooltip', 'getColumnsConfiguration'],
    profile: 'traces',
  },

  // Metrics Profile
  'AC-M001': {
    description: 'TS command activation',
    keywords: ['ts', 'time series', 'command', 'match', 'resolve', 'metrics'],
    profile: 'metrics',
  },
  'AC-M002': {
    description: 'FROM command non-activation',
    keywords: ['from', 'command', 'not', 'match', 'metrics'],
    profile: 'metrics',
  },
  'AC-M003': {
    description: 'MetricsGrid visualization',
    keywords: ['metricsgrid', 'grid', 'visualization', 'chart', 'getChartSection'],
    profile: 'metrics',
  },
  'AC-M004': {
    description: 'Multi-dimensional breakdown',
    keywords: ['breakdown', 'multi', 'dimensional', 'field'],
    profile: 'metrics',
  },
  'AC-M005': {
    description: 'Supported commands validation',
    keywords: ['supported', 'commands', 'ts', 'limit', 'sort', 'where'],
    profile: 'metrics',
  },
  'AC-M006': {
    description: 'Unsupported commands rejection',
    keywords: ['unsupported', 'commands', 'stats', 'eval', 'not', 'match'],
    profile: 'metrics',
  },

  // Patterns Profile
  'AC-P001': {
    description: 'CATEGORIZE activation',
    keywords: ['categorize', 'pattern', 'match', 'resolve', 'esql'],
    profile: 'patterns',
  },
  'AC-P002': {
    description: 'ES|QL-only data source',
    keywords: ['esql', 'only', 'data source', 'not', 'data view'],
    profile: 'patterns',
  },
  'AC-P003': {
    description: 'Token badge rendering',
    keywords: ['token', 'badge', 'pattern', 'render', 'getCellRenderers'],
    profile: 'patterns',
  },
  'AC-P004': {
    description: 'View matching results action',
    keywords: ['view', 'matching', 'results', 'action', 'getAdditionalCellActions'],
    profile: 'patterns',
  },
  'AC-P005': {
    description: 'MATCH query generation',
    keywords: ['match', 'query', 'pattern', 'discover', 'tab'],
    profile: 'patterns',
  },
  'AC-P006': {
    description: 'Default columns',
    keywords: ['default', 'columns', 'count', 'pattern', 'getDefaultAppState'],
    profile: 'patterns',
  },
  'AC-P007': {
    description: 'Tokens detail section',
    keywords: ['tokens', 'detail', 'view', 'flyout'],
    profile: 'patterns',
  },
  'AC-P008': {
    description: 'Regex detail section',
    keywords: ['regex', 'detail', 'view', 'flyout'],
    profile: 'patterns',
  },

  // Security Profile
  'AC-S001': {
    description: 'Security root profile activation',
    keywords: ['security', 'root', 'profile', 'solution', 'match'],
    profile: 'security',
  },
  'AC-S002': {
    description: 'Alerts sub-context activation',
    keywords: ['alerts', 'security', 'index', 'match', '.alerts-security'],
    profile: 'security',
  },
  'AC-S003': {
    description: 'workflow_status cell renderer',
    keywords: ['workflow_status', 'cell', 'render', 'alert', 'getCellRenderers'],
    profile: 'security',
  },
  'AC-S004': {
    description: 'Warning color for alerts',
    keywords: ['warning', 'color', 'alert', 'indicator', 'row'],
    profile: 'security',
  },
  'AC-S005': {
    description: 'Light color for events',
    keywords: ['light', 'color', 'event', 'indicator', 'row'],
    profile: 'security',
  },
  'AC-S006': {
    description: 'Default alert columns',
    keywords: [
      'default',
      'columns',
      'alert',
      'workflow_status',
      'event.category',
      'host.name',
      'source.ip',
    ],
    profile: 'security',
  },
  'AC-S007': {
    description: 'Histogram breakdown by status',
    keywords: ['histogram', 'breakdown', 'workflow_status', 'alert'],
    profile: 'security',
  },
};

/**
 * Represents an extracted test description
 */
interface TestDescription {
  type: 'describe' | 'it' | 'test';
  name: string;
  path: string[];
  line: number;
  filePath: string;
  testType: 'unit' | 'ftr';
  searchableText: string;
}

/**
 * Represents the coverage result for an acceptance criteria
 */
interface CoverageResult {
  criteriaId: string;
  description: string;
  profile: string;
  unitTests: TestMatch[];
  ftrTests: TestMatch[];
  status: 'covered' | 'partial' | 'not-covered';
  matchScore: number;
}

/**
 * Represents a test that matches an acceptance criteria
 */
interface TestMatch {
  testName: string;
  filePath: string;
  line: number;
  matchedKeywords: string[];
  score: number;
}

/**
 * Find all test files in the configured directories
 */
function findTestFiles(rootDir: string): string[] {
  const testFiles: string[] = [];

  for (const testDir of CONFIG.testDirectories) {
    const fullPath = path.join(rootDir, testDir);
    if (fs.existsSync(fullPath)) {
      walkDirectory(fullPath, testFiles);
    }
  }

  return testFiles;
}

/**
 * Recursively walk a directory and collect test files
 */
function walkDirectory(dir: string, files: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded patterns
    if (CONFIG.excludePatterns.some((pattern) => pattern.test(fullPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      walkDirectory(fullPath, files);
    } else if (entry.isFile()) {
      // Check if file matches test patterns
      if (CONFIG.testFilePatterns.some((pattern) => pattern.test(entry.name))) {
        files.push(fullPath);
      }
    }
  }
}

/**
 * Parse a test file and extract test descriptions using regex
 * This approach is simpler and more reliable than AST parsing for this use case
 */
function parseTestFile(filePath: string, rootDir: string): TestDescription[] {
  const tests: TestDescription[] = [];
  const code = fs.readFileSync(filePath, 'utf-8');

  // Determine test type based on path
  const relativePath = path.relative(rootDir, filePath);
  const testType =
    relativePath.includes('test/functional') || relativePath.includes('test/serverless')
      ? 'ftr'
      : 'unit';

  // Regex patterns to extract describe and it/test blocks
  // Match describe('name', ...) or describe(`name`, ...)
  const describePattern = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
  // Match it('name', ...) or it(`name`, ...) or test('name', ...)
  const itPattern = /(?:^|\s)(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  // Match it.each(...)('name', ...) patterns
  const itEachPattern = /it\.each\s*\([^)]+\)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  try {
    // Extract all describe block names to build context
    const describeMatches: string[] = [];
    let match;

    while ((match = describePattern.exec(code)) !== null) {
      describeMatches.push(match[1]);
    }

    // Extract all it/test blocks
    const lines = code.split('\n');
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      // Check for it/test patterns
      itPattern.lastIndex = 0;
      const itMatch = itPattern.exec(line);
      if (itMatch) {
        const testName = itMatch[1];
        const searchableText = [...describeMatches, testName].join(' ').toLowerCase();

        tests.push({
          type: 'it',
          name: testName,
          path: [...describeMatches],
          line: lineNumber,
          filePath: relativePath,
          testType,
          searchableText,
        });
      }

      // Check for it.each patterns
      itEachPattern.lastIndex = 0;
      const itEachMatch = itEachPattern.exec(line);
      if (itEachMatch) {
        const testName = itEachMatch[1] + ' (parameterized)';
        const searchableText = [...describeMatches, testName].join(' ').toLowerCase();

        tests.push({
          type: 'it',
          name: testName,
          path: [...describeMatches],
          line: lineNumber,
          filePath: relativePath,
          testType,
          searchableText,
        });
      }
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Warning: Could not parse ${filePath}: ${(error as Error).message}`);
  }

  return tests;
}

/**
 * Calculate match score between a test and acceptance criteria keywords
 */
function calculateMatchScore(
  searchableText: string,
  keywords: string[]
): { score: number; matchedKeywords: string[] } {
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (searchableText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
      score += 1;

      // Bonus for exact word match
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedKeyword)}\\b`);
      if (wordBoundaryRegex.test(searchableText)) {
        score += 0.5;
      }
    }
  }

  return { score, matchedKeywords };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Analyze test coverage for all acceptance criteria
 */
function analyzeCoverage(tests: TestDescription[]): CoverageResult[] {
  const results: CoverageResult[] = [];

  for (const [criteriaId, criteria] of Object.entries(ACCEPTANCE_CRITERIA)) {
    const unitTests: TestMatch[] = [];
    const ftrTests: TestMatch[] = [];

    for (const test of tests) {
      const { score, matchedKeywords } = calculateMatchScore(
        test.searchableText,
        criteria.keywords
      );

      if (score >= CONFIG.thresholds.partial) {
        const match: TestMatch = {
          testName: test.name,
          filePath: test.filePath,
          line: test.line,
          matchedKeywords,
          score,
        };

        if (test.testType === 'unit') {
          unitTests.push(match);
        } else {
          ftrTests.push(match);
        }
      }
    }

    // Sort matches by score descending
    unitTests.sort((a, b) => b.score - a.score);
    ftrTests.sort((a, b) => b.score - a.score);

    // Determine overall coverage status
    const bestUnitScore = unitTests[0]?.score ?? 0;
    const bestFtrScore = ftrTests[0]?.score ?? 0;
    const maxScore = Math.max(bestUnitScore, bestFtrScore);

    let status: 'covered' | 'partial' | 'not-covered';
    if (maxScore >= CONFIG.thresholds.covered) {
      status = 'covered';
    } else if (maxScore >= CONFIG.thresholds.partial) {
      status = 'partial';
    } else {
      status = 'not-covered';
    }

    results.push({
      criteriaId,
      description: criteria.description,
      profile: criteria.profile,
      unitTests: unitTests.slice(0, 3), // Top 3 matches
      ftrTests: ftrTests.slice(0, 3),
      status,
      matchScore: maxScore,
    });
  }

  return results;
}

/**
 * Format results as markdown table
 */
function formatMarkdown(results: CoverageResult[], verbose: boolean): string {
  const lines: string[] = [];

  lines.push('# Discover ES|QL Test Coverage Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary statistics
  const covered = results.filter((r) => r.status === 'covered').length;
  const partial = results.filter((r) => r.status === 'partial').length;
  const notCovered = results.filter((r) => r.status === 'not-covered').length;

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Status | Count | Percentage |`);
  lines.push(`|--------|-------|------------|`);
  lines.push(`| ✅ Covered | ${covered} | ${((covered / results.length) * 100).toFixed(1)}% |`);
  lines.push(`| ⚠️ Partial | ${partial} | ${((partial / results.length) * 100).toFixed(1)}% |`);
  lines.push(
    `| ❌ Not Covered | ${notCovered} | ${((notCovered / results.length) * 100).toFixed(1)}% |`
  );
  lines.push('');

  // Group by profile
  const profiles = ['logs', 'traces', 'metrics', 'patterns', 'security'];

  for (const profile of profiles) {
    const profileResults = results.filter((r) => r.profile === profile);
    if (profileResults.length === 0) continue;

    lines.push(`## ${profile.charAt(0).toUpperCase() + profile.slice(1)} Profile`);
    lines.push('');
    lines.push('| AC ID | Description | Unit Test | FTR Test | Status |');
    lines.push('|-------|-------------|-----------|----------|--------|');

    for (const result of profileResults) {
      const statusIcon =
        result.status === 'covered' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';

      const unitTest = result.unitTests[0]
        ? `\`${path.basename(result.unitTests[0].filePath)}\``
        : '-';
      const ftrTest = result.ftrTests[0]
        ? `\`${path.basename(result.ftrTests[0].filePath)}\``
        : '-';

      lines.push(
        `| ${result.criteriaId} | ${result.description} | ${unitTest} | ${ftrTest} | ${statusIcon} |`
      );

      if (verbose && (result.unitTests.length > 0 || result.ftrTests.length > 0)) {
        lines.push('');
        lines.push(`  **Matched tests for ${result.criteriaId}:**`);

        for (const match of result.unitTests) {
          lines.push(`  - Unit: "${match.testName}" (${match.filePath}:${match.line})`);
          lines.push(`    Keywords: ${match.matchedKeywords.join(', ')}`);
        }

        for (const match of result.ftrTests) {
          lines.push(`  - FTR: "${match.testName}" (${match.filePath}:${match.line})`);
          lines.push(`    Keywords: ${match.matchedKeywords.join(', ')}`);
        }
        lines.push('');
      }
    }

    lines.push('');
  }

  // Coverage gaps section
  const gaps = results.filter((r) => r.status === 'not-covered');
  if (gaps.length > 0) {
    lines.push('## Coverage Gaps (Not Covered)');
    lines.push('');
    lines.push('The following acceptance criteria have no matching tests:');
    lines.push('');

    for (const gap of gaps) {
      lines.push(`- **${gap.criteriaId}**: ${gap.description} (${gap.profile} profile)`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format results as JSON
 */
function formatJson(results: CoverageResult[]): string {
  return JSON.stringify(
    {
      generated: new Date().toISOString(),
      summary: {
        total: results.length,
        covered: results.filter((r) => r.status === 'covered').length,
        partial: results.filter((r) => r.status === 'partial').length,
        notCovered: results.filter((r) => r.status === 'not-covered').length,
      },
      results,
    },
    null,
    2
  );
}

/**
 * Main function
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    // eslint-disable-next-line no-console
    console.log(`
Discover ES|QL Test Coverage Analyzer

Usage:
  node scripts/analyze_discover_test_coverage.js [options]

Options:
  --output <format>   Output format: 'markdown' (default) or 'json'
  --verbose           Show all keyword matches for each criteria
  --help              Show this help message
`);
    process.exit(0);
  }

  const outputFormat = args.includes('--output')
    ? args[args.indexOf('--output') + 1] || 'markdown'
    : 'markdown';
  const verbose = args.includes('--verbose');

  // Find root directory (should be kibana root)
  const rootDir = process.cwd();

  // eslint-disable-next-line no-console
  console.error('Scanning for test files...');
  const testFiles = findTestFiles(rootDir);
  // eslint-disable-next-line no-console
  console.error(`Found ${testFiles.length} test files`);

  // eslint-disable-next-line no-console
  console.error('Parsing test files...');
  const allTests: TestDescription[] = [];
  for (const file of testFiles) {
    const tests = parseTestFile(file, rootDir);
    allTests.push(...tests);
  }
  // eslint-disable-next-line no-console
  console.error(`Extracted ${allTests.length} test descriptions`);

  // eslint-disable-next-line no-console
  console.error('Analyzing coverage...');
  const results = analyzeCoverage(allTests);

  // Output results
  if (outputFormat === 'json') {
    // eslint-disable-next-line no-console
    console.log(formatJson(results));
  } else {
    // eslint-disable-next-line no-console
    console.log(formatMarkdown(results, verbose));
  }
}

main();
