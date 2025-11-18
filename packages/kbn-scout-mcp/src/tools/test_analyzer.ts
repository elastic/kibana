/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Test Suitability Analyzer
 *
 * Analyzes test cases to determine if Scout E2E is the right approach
 * or if unit/integration tests would be more appropriate.
 *
 * Uses a hybrid approach: fast regex-based detection for simple patterns,
 * AST parsing for complex code analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  shouldUseAST,
  analyzeCodeWithAST,
  extractAllTestDescriptions,
  type DeepCodeAnalysis,
} from '../utils/ast_parser';

export interface TestAnalysisResult {
  recommendedType: 'unit' | 'integration' | 'e2e';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string[];
  alternativeApproaches: string[];
  estimatedSpeed: string;
  estimatedMaintenance: 'low' | 'medium' | 'high';
  codeSmells?: string[];
  examples?: {
    unit?: string;
    integration?: string;
    e2e?: string;
  };
}

interface TestCharacteristics {
  // Original characteristics (regex-based)
  isPureFunction: boolean;
  isComponentTest: boolean;
  isApiTest: boolean;
  hasMultiplePages: boolean;
  hasBrowserInteraction: boolean;
  hasComplexUserFlow: boolean;
  hasBackendOnly: boolean;
  hasBusinessLogic: boolean;
  hasDataTransformation: boolean;

  // Enhanced characteristics (from AST analysis)
  hasOnlyApiCalls?: boolean;
  hasOnlyDataValidation?: boolean;
  testComplexity?: 'simple' | 'medium' | 'complex';
  numberOfSteps?: number;
  hasStateDependencies?: boolean;
  requiresAuthentication?: boolean;
  requiresDataSetup?: boolean;
  hasCustomCommands?: number;
  hasIntercepts?: number;
  uiInteractionCount?: number;
  apiCallCount?: number;

  // Code smells (from AST analysis)
  hasHardWaits?: boolean;
  hasBrittleSelectors?: boolean;
}

/**
 * Analyze test suitability
 */
export async function scoutAnalyzeTestSuitability(params: {
  testDescription: string;
  testCode?: string;
  context?: 'cypress_migration' | 'new_test_generation' | 'general';
}) {
  try {
    const { testDescription, testCode = '', context = 'general' } = params;

    // Combine description and code for analysis
    const fullText = `${testDescription}\n${testCode}`.toLowerCase();

    // Hybrid approach: use AST for complex code, regex for simple patterns
    let characteristics: TestCharacteristics;
    let codeSmells: string[] = [];

    if (testCode && shouldUseAST(testCode)) {
      // Use AST-based analysis for complex code
      const deepAnalysis = analyzeCodeWithAST(testCode);
      characteristics = {
        ...analyzeCharacteristics(fullText),
        ...deepAnalysis,
      };
      codeSmells = detectCodeSmells(deepAnalysis);
    } else {
      // Use faster regex-based analysis for simple patterns
      characteristics = analyzeCharacteristics(fullText);
      // Also detect code smells using regex patterns
      codeSmells = detectCodeSmellsRegex(testCode || testDescription);
    }

    // Score each test type
    const scores = calculateScores(characteristics);

    // Determine recommendation
    const recommendedType = getRecommendation(scores);
    const confidence = getConfidence(scores, recommendedType);

    // Generate reasoning
    const reasoning = generateReasoning(characteristics, recommendedType);

    // Generate alternatives
    const alternativeApproaches = generateAlternatives(recommendedType, characteristics);

    // Estimate metrics
    const estimatedSpeed = estimateSpeed(recommendedType, characteristics);
    const estimatedMaintenance = estimateMaintenance(recommendedType);

    // Generate examples
    const examples = generateExamples(testDescription, recommendedType);

    return {
      success: true,
      data: {
        recommendedType,
        confidence,
        reasoning,
        alternativeApproaches,
        estimatedSpeed,
        estimatedMaintenance,
        codeSmells: codeSmells.length > 0 ? codeSmells : undefined,
        examples,
        context,
      },
      message: `Analysis complete: ${recommendedType} test recommended (${confidence} confidence)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Analyze characteristics from test description and code
 */
function analyzeCharacteristics(text: string): TestCharacteristics {
  // Count browser interactions
  const clickCount = (text.match(/click|press|submit/g) || []).length;
  const typeCount = (text.match(/type|fill|input|enter/g) || []).length;
  const selectCount = (text.match(/select|choose|check/g) || []).length;
  const uiInteractionCount = clickCount + typeCount + selectCount;

  // Count API calls - only count actual API calls, not just the word "api" or HTTP methods
  const cyRequestCount = (text.match(/cy\.request\(/g) || []).length;
  const apiEndpointMentions = text.includes('/api/') ? 1 : 0;
  // Use cy.request count as the primary indicator, or 1 if /api/ is mentioned
  const apiCallCount = cyRequestCount > 0 ? cyRequestCount : apiEndpointMentions;

  // Detect authentication patterns
  const requiresAuthentication =
    text.includes('login') ||
    text.includes('auth') ||
    text.includes('username') ||
    text.includes('password') ||
    text.includes('credential');

  return {
    // Pure function indicators
    isPureFunction:
      (text.includes('function') ||
        text.includes('calculate') ||
        text.includes('transform') ||
        text.includes('parse') ||
        text.includes('format') ||
        text.includes('validate')) &&
      !text.includes('navigate') &&
      !text.includes('click') &&
      !text.includes('api'),

    // Component test indicators
    isComponentTest:
      (text.includes('component') ||
        text.includes('render') ||
        text.includes('hook') ||
        text.includes('display')) &&
      !text.includes('navigate') &&
      !text.includes('multiple page'),

    // API test indicators
    isApiTest:
      (text.includes('api') ||
        text.includes('endpoint') ||
        text.includes('request') ||
        text.includes('response') ||
        text.includes('post') ||
        text.includes('get') ||
        text.includes('/api/')) &&
      !text.includes('ui') &&
      !text.includes('navigate'),

    // Multi-page indicators
    hasMultiplePages:
      text.includes('navigate') ||
      text.includes('multiple page') ||
      text.includes('workflow') ||
      text.includes('journey') ||
      (text.includes('cy.visit') && text.match(/cy\.visit/g)!.length > 1) ||
      (text.includes('then') && text.includes('page')),

    // Browser interaction indicators
    hasBrowserInteraction:
      text.includes('click') ||
      text.includes('type') ||
      text.includes('select') ||
      text.includes('fill') ||
      text.includes('interact') ||
      text.includes('user'),

    // Complex user flow indicators
    hasComplexUserFlow:
      (text.includes('user') && text.includes('then')) ||
      text.includes('workflow') ||
      text.includes('journey') ||
      text.includes('scenario') ||
      (text.includes('create') && text.includes('edit') && text.includes('delete')) ||
      (text.includes('create') && text.includes('navigate') && text.includes('verify')),

    // Backend only indicators
    hasBackendOnly:
      (text.includes('database') ||
        text.includes('elasticsearch') ||
        text.includes('service') ||
        text.includes('backend') ||
        text.includes('cy.task')) &&
      !text.includes('ui') &&
      !text.includes('component'),

    // Business logic indicators
    hasBusinessLogic:
      text.includes('logic') ||
      text.includes('calculation') ||
      text.includes('rule') ||
      text.includes('algorithm'),

    // Data transformation indicators
    hasDataTransformation:
      text.includes('transform') ||
      text.includes('map') ||
      text.includes('reduce') ||
      text.includes('filter') ||
      text.includes('convert'),

    // Enhanced characteristics
    uiInteractionCount,
    apiCallCount,
    requiresAuthentication,
  };
}

/**
 * Calculate suitability scores for each test type
 * Enhanced with AST-based characteristics
 */
function calculateScores(characteristics: TestCharacteristics): {
  unit: number;
  integration: number;
  e2e: number;
} {
  let unitScore = 0;
  let integrationScore = 0;
  let e2eScore = 0;

  // Unit test scoring (regex-based)
  if (characteristics.isPureFunction) unitScore += 10;
  if (characteristics.hasBusinessLogic) unitScore += 8;
  if (characteristics.hasDataTransformation) unitScore += 8;
  if (characteristics.isComponentTest && !characteristics.hasComplexUserFlow) unitScore += 7;
  if (!characteristics.hasBrowserInteraction) unitScore += 5;
  if (!characteristics.hasMultiplePages) unitScore += 5;

  // Enhanced unit scoring (AST-based)
  if (characteristics.hasOnlyDataValidation) unitScore += 12;
  if (characteristics.testComplexity === 'simple' && !characteristics.hasBrowserInteraction) {
    unitScore += 6;
  }
  if (characteristics.uiInteractionCount === 0 && characteristics.apiCallCount === 0) {
    unitScore += 8;
  }

  // Integration test scoring (regex-based)
  if (characteristics.isApiTest) integrationScore += 10;
  if (characteristics.hasBackendOnly) integrationScore += 20; // Backend-only tests are definitely integration
  if (!characteristics.hasBrowserInteraction && !characteristics.isPureFunction)
    integrationScore += 7;
  if (characteristics.isApiTest && !characteristics.hasMultiplePages) integrationScore += 8;

  // Enhanced integration scoring (AST-based)
  if (characteristics.hasOnlyApiCalls) integrationScore += 15;
  if (
    characteristics.apiCallCount &&
    characteristics.apiCallCount > 0 &&
    characteristics.uiInteractionCount === 0
  ) {
    integrationScore += 10;
  }
  if (characteristics.hasIntercepts && characteristics.hasIntercepts > 0) {
    integrationScore += 5;
  }

  // E2E test scoring (regex-based)
  if (characteristics.hasMultiplePages) e2eScore += 10;
  if (characteristics.hasComplexUserFlow) e2eScore += 10;
  if (characteristics.hasBrowserInteraction && characteristics.hasMultiplePages) e2eScore += 8;
  if (characteristics.hasComplexUserFlow && !characteristics.isPureFunction) e2eScore += 7;

  // Enhanced E2E scoring (AST-based)
  if (characteristics.testComplexity === 'complex') e2eScore += 8;
  if (
    characteristics.uiInteractionCount &&
    characteristics.uiInteractionCount > 5 &&
    characteristics.hasMultiplePages
  ) {
    e2eScore += 12;
  }
  if (characteristics.hasStateDependencies) e2eScore += 6;
  if (characteristics.requiresAuthentication && characteristics.hasMultiplePages) {
    e2eScore += 5;
  }

  // Additional E2E scoring for browser-heavy tests
  if (characteristics.uiInteractionCount && characteristics.uiInteractionCount >= 4) {
    e2eScore += 12; // Multiple UI interactions suggest E2E
    integrationScore -= 8; // Not integration if heavy UI
    unitScore -= 8; // Not unit if heavy UI
  }
  if (
    characteristics.requiresAuthentication &&
    characteristics.uiInteractionCount &&
    characteristics.uiInteractionCount > 2
  ) {
    e2eScore += 10; // Auth + UI interactions = E2E
  }
  // Strong E2E signal: multiple UI interactions with cy.visit
  if (
    characteristics.hasBrowserInteraction &&
    characteristics.uiInteractionCount &&
    characteristics.uiInteractionCount >= 4
  ) {
    e2eScore += 8; // Additional boost for clear E2E pattern
  }

  // Penalties for wrong test type
  if (characteristics.isPureFunction) {
    integrationScore -= 5;
    e2eScore -= 10;
  }
  if (characteristics.hasBackendOnly) {
    e2eScore -= 8;
  }
  if (characteristics.hasMultiplePages) {
    unitScore -= 10;
  }
  if (characteristics.hasOnlyApiCalls) {
    e2eScore -= 12;
    unitScore -= 8;
  }
  if (characteristics.testComplexity === 'simple' && characteristics.uiInteractionCount === 0) {
    e2eScore -= 8;
  }

  return {
    unit: Math.max(0, unitScore),
    integration: Math.max(0, integrationScore),
    e2e: Math.max(0, e2eScore),
  };
}

/**
 * Get recommendation based on scores
 */
function getRecommendation(scores: {
  unit: number;
  integration: number;
  e2e: number;
}): 'unit' | 'integration' | 'e2e' {
  if (scores.unit >= scores.integration && scores.unit >= scores.e2e) {
    return 'unit';
  }
  if (scores.integration >= scores.e2e) {
    return 'integration';
  }
  return 'e2e';
}

/**
 * Get confidence level
 */
function getConfidence(
  scores: { unit: number; integration: number; e2e: number },
  recommended: string
): 'high' | 'medium' | 'low' {
  const recommendedScore = scores[recommended as keyof typeof scores];
  const otherScores = Object.entries(scores)
    .filter(([type]) => type !== recommended)
    .map(([, score]) => score);

  const maxOtherScore = Math.max(...otherScores);
  const difference = recommendedScore - maxOtherScore;

  if (difference >= 10) return 'high';
  if (difference >= 5) return 'medium';
  return 'low';
}

/**
 * Generate reasoning for recommendation
 * Enhanced with AST-based insights
 */
function generateReasoning(
  characteristics: TestCharacteristics,
  recommendedType: 'unit' | 'integration' | 'e2e'
): string[] {
  const reasoning: string[] = [];

  if (recommendedType === 'unit') {
    if (characteristics.isPureFunction) {
      reasoning.push('✓ Pure function with no side effects');
    }
    if (characteristics.hasBusinessLogic) {
      reasoning.push('✓ Tests business logic that can be isolated');
    }
    if (characteristics.hasDataTransformation) {
      reasoning.push('✓ Data transformation can be tested independently');
    }
    if (characteristics.hasOnlyDataValidation) {
      reasoning.push('✓ Only validates data with no external interactions');
    }
    if (!characteristics.hasBrowserInteraction) {
      reasoning.push('✓ No browser interaction needed');
    }
    if (!characteristics.hasMultiplePages) {
      reasoning.push('✓ No multi-page navigation required');
    }
    if (characteristics.testComplexity === 'simple') {
      reasoning.push('✓ Simple test logic, well-suited for unit testing');
    }
    reasoning.push('✓ Fast to run (< 1s)');
    reasoning.push('✓ Easy to maintain and debug');
    reasoning.push('✓ High reliability (no flakiness)');
  } else if (recommendedType === 'integration') {
    if (characteristics.isApiTest) {
      reasoning.push('✓ Tests API endpoint behavior');
    }
    if (characteristics.hasBackendOnly) {
      reasoning.push('✓ Backend-only validation');
    }
    if (characteristics.hasOnlyApiCalls) {
      reasoning.push('✓ Only makes API calls without UI interaction');
    }
    if (!characteristics.hasBrowserInteraction) {
      reasoning.push('✓ No UI interaction needed');
    }
    if (characteristics.apiCallCount && characteristics.apiCallCount > 0) {
      reasoning.push(`✓ Makes ${characteristics.apiCallCount} API call(s)`);
    }
    if (characteristics.hasIntercepts) {
      reasoning.push('✓ Uses intercepts for API mocking/testing');
    }
    reasoning.push('✓ Faster than E2E (5-10s vs 30s+)');
    reasoning.push('✓ More focused and reliable');
    reasoning.push('✓ Tests service integration directly');
  } else {
    // e2e
    if (characteristics.hasMultiplePages) {
      reasoning.push('✓ Multi-step user workflow across pages');
    }
    if (characteristics.hasComplexUserFlow) {
      reasoning.push('✓ Complex user journey that needs full context');
    }
    if (characteristics.hasBrowserInteraction && characteristics.hasMultiplePages) {
      reasoning.push('✓ Requires browser state management');
    }
    if (characteristics.testComplexity === 'complex') {
      reasoning.push('✓ Complex workflow requiring E2E validation');
    }
    if (characteristics.uiInteractionCount && characteristics.uiInteractionCount > 5) {
      reasoning.push(`✓ Multiple UI interactions (${characteristics.uiInteractionCount})`);
    }
    if (characteristics.requiresAuthentication) {
      reasoning.push('✓ Requires user authentication flow');
    }
    if (characteristics.hasStateDependencies) {
      reasoning.push('✓ Has state dependencies across actions');
    }
    reasoning.push('✓ Tests end-to-end integration');
    reasoning.push('✓ Validates real user scenarios');
    reasoning.push('✓ This is what Scout is designed for');
  }

  return reasoning;
}

/**
 * Generate alternative approaches
 */
function generateAlternatives(
  recommendedType: 'unit' | 'integration' | 'e2e',
  characteristics: TestCharacteristics
): string[] {
  const alternatives: string[] = [];

  if (recommendedType === 'unit') {
    if (characteristics.hasBrowserInteraction) {
      alternatives.push('Could use React Testing Library for component interactions');
    }
    alternatives.push('None - unit test is optimal for this scenario');
  } else if (recommendedType === 'integration') {
    alternatives.push('Scout E2E would work but is slower and more complex');
    if (!characteristics.hasBackendOnly) {
      alternatives.push('Unit tests for individual components + integration for API');
    }
  } else {
    // e2e
    if (!characteristics.hasComplexUserFlow) {
      alternatives.push('Consider integration tests if backend validation is main goal');
    }
    if (!characteristics.hasMultiplePages) {
      alternatives.push('Consider unit tests if testing single component behavior');
    }
  }

  return alternatives;
}

/**
 * Detect code smells using regex patterns (for simple tests without AST)
 */
function detectCodeSmellsRegex(code: string): string[] {
  const smells: string[] = [];

  // Hard waits (cy.wait with number)
  if (/cy\.wait\(\s*\d+\s*\)/.test(code)) {
    smells.push('⚠️ Hard waits detected - use proper wait conditions instead');
  }

  // Brittle selectors (class, ID, or generic tag selectors)
  if (/cy\.get\(['"]\s*[.#]|\bcy\.get\(['"]\s*\w+\s*['"]\)/.test(code)) {
    smells.push('⚠️ Brittle selectors (ID/class) - prefer data-test-subj attributes');
  }

  // Custom commands
  const customCommandMatches = code.match(/cy\.\w+\(/g);
  const standardCommands = [
    'visit',
    'get',
    'click',
    'type',
    'should',
    'expect',
    'wait',
    'intercept',
    'request',
    'task',
    'contains',
    'find',
    'first',
    'last',
    'eq',
    'select',
    'check',
    'uncheck',
    'clear',
    'focus',
    'blur',
    'submit',
  ];
  const customCommands =
    customCommandMatches?.filter((cmd) => {
      const cmdName = cmd.replace('cy.', '').replace('(', '');
      return !standardCommands.includes(cmdName);
    }) || [];

  if (customCommands.length > 3) {
    smells.push(`⚠️ ${customCommands.length} custom commands - may complicate migration to Scout`);
  }

  // Test length (count lines of actual code, not empty lines)
  const codeLines = code
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('//')).length;
  if (codeLines > 25) {
    smells.push(
      `⚠️ Test is very long (${codeLines} lines) - consider splitting into multiple tests`
    );
  }

  // Few or no assertions (only flag if there are many actions without assertions)
  const assertionCount = (code.match(/expect\(|should\(|\.to\.|\.toBe\(|\.toEqual\(/g) || [])
    .length;
  const actionCount = (code.match(/cy\.(click|type|select|check|visit|get)\(/g) || []).length;
  // Only flag if: many actions (>=5) with very few assertions (<20% ratio)
  // Don't flag if there are 0 actions (pure logic tests) or if the ratio is reasonable
  // Also don't flag if there's at least 1 assertion and fewer than 5 actions
  if (actionCount >= 5 && assertionCount > 0 && assertionCount < actionCount * 0.2) {
    smells.push('⚠️ Few or no assertions - test may not validate behavior adequately');
  } else if (actionCount >= 5 && assertionCount === 0) {
    smells.push('⚠️ Few or no assertions - test may not validate behavior adequately');
  }

  return smells;
}

/**
 * Detect code smells from AST analysis
 */
function detectCodeSmells(analysis: Partial<DeepCodeAnalysis>): string[] {
  const smells: string[] = [];

  if (analysis.hasHardWaits) {
    smells.push('⚠️ Hard waits detected - use proper wait conditions instead');
  }

  if (analysis.hasBrittleSelectors) {
    smells.push('⚠️ Brittle selectors (ID/class) - prefer data-test-subj attributes');
  }

  if (analysis.hasCustomCommands && analysis.hasCustomCommands > 3) {
    smells.push(
      `⚠️ ${analysis.hasCustomCommands} custom commands - may complicate migration to Scout`
    );
  }

  if (analysis.numberOfSteps && analysis.numberOfSteps > 20) {
    smells.push(
      `⚠️ Test is very long (${analysis.numberOfSteps} steps) - consider splitting into multiple tests`
    );
  }

  // Only flag if many steps with few assertions
  // Don't flag simple tests (< 5 steps) or tests with reasonable assertion ratios
  if (
    analysis.numberOfSteps &&
    analysis.numberOfSteps >= 5 &&
    analysis.assertionCount !== undefined
  ) {
    if (analysis.assertionCount === 0) {
      smells.push('⚠️ Few or no assertions - test may not validate behavior adequately');
    } else if (
      analysis.assertionCount > 0 &&
      analysis.assertionCount < analysis.numberOfSteps * 0.2
    ) {
      smells.push('⚠️ Few or no assertions - test may not validate behavior adequately');
    }
  }

  return smells;
}

/**
 * Estimate test speed based on type and characteristics
 */
function estimateSpeed(
  testType: 'unit' | 'integration' | 'e2e',
  characteristics: TestCharacteristics
): string {
  switch (testType) {
    case 'unit':
      return '< 1s (very fast)';
    case 'integration':
      // Count API calls - be more precise about what counts as "multiple"
      const apiCallCount = characteristics.apiCallCount || 0;
      if (apiCallCount >= 3) {
        return '10-20s (moderate - multiple API calls)';
      }
      return '5-10s (fast)';
    case 'e2e':
      if (characteristics.testComplexity === 'complex') {
        return '60s+ (complex E2E workflow)';
      }
      if (characteristics.numberOfSteps && characteristics.numberOfSteps > 15) {
        return '45-60s (many steps)';
      }
      // Check for complex E2E patterns
      if (characteristics.uiInteractionCount && characteristics.uiInteractionCount > 10) {
        return '45-60s (many interactions)';
      }
      if (characteristics.hasComplexUserFlow && characteristics.hasMultiplePages) {
        return '45-60s (complex workflow)';
      }
      return '30s+ (acceptable for E2E)';
  }
}

/**
 * Estimate maintenance effort
 */
function estimateMaintenance(testType: 'unit' | 'integration' | 'e2e'): 'low' | 'medium' | 'high' {
  switch (testType) {
    case 'unit':
      return 'low';
    case 'integration':
      return 'medium';
    case 'e2e':
      return 'medium';
  }
}

/**
 * Generate example code for each test type
 */
function generateExamples(
  testDescription: string,
  recommendedType: 'unit' | 'integration' | 'e2e'
): { unit?: string; integration?: string; e2e?: string } {
  const examples: { unit?: string; integration?: string; e2e?: string } = {};

  if (recommendedType === 'unit') {
    examples.unit = `// Example Unit Test (Jest)
describe('${testDescription}', () => {
  it('should work correctly', () => {
    // Arrange
    const input = /* test data */;

    // Act
    const result = yourFunction(input);

    // Assert
    expect(result).toBe(expectedValue);
  });
});`;
  } else if (recommendedType === 'integration') {
    examples.integration = `// Example Integration Test (FTR)
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('${testDescription}', () => {
    it('should work correctly', async () => {
      const response = await supertest
        .post('/api/your-endpoint')
        .send({ data: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('expectedField');
    });
  });
}`;
  } else {
    examples.e2e = `// Example E2E Test (Scout)
import { expect, test } from '@kbn/scout';

test.describe('${testDescription}', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('yourApp');
  });

  test('should work correctly', async ({ page, pageObjects }) => {
    // Navigate and interact
    await pageObjects.yourPage.performAction();

    // Verify
    await expect(pageObjects.yourPage.result).toBeVisible();
  });
});`;
  }

  return examples;
}

/**
 * Batch Test Suite Analyzer
 *
 * Analyzes an entire Cypress test suite to provide comprehensive insights
 * on which tests should be migrated to Scout E2E vs converted to unit/integration
 */

export interface TestSuiteAnalysisResult {
  totalTests: number;
  breakdown: {
    shouldBeUnit: number;
    shouldBeIntegration: number;
    shouldBeE2E: number;
  };
  testDetails: Array<{
    filePath: string;
    testDescription: string;
    recommendedType: 'unit' | 'integration' | 'e2e';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string[];
  }>;
  sharedDependencies: string[];
  migrationOrder: string[];
  estimatedEffort: string;
  summary: string;
}

export async function scoutAnalyzeTestSuite(params: {
  cypressTestDirectory: string;
  filePattern?: string;
}) {
  try {
    const { cypressTestDirectory, filePattern = '**/*.cy.{ts,js}' } = params;

    // Verify directory exists
    if (!fs.existsSync(cypressTestDirectory)) {
      return {
        success: false,
        error: `Directory not found: ${cypressTestDirectory}`,
      };
    }

    const stats = fs.statSync(cypressTestDirectory);
    if (!stats.isDirectory()) {
      return {
        success: false,
        error: `Path is not a directory: ${cypressTestDirectory}`,
      };
    }

    // Find all Cypress test files
    const testFiles = findTestFiles(cypressTestDirectory, filePattern);

    if (testFiles.length === 0) {
      return {
        success: false,
        error: `No test files found matching pattern: ${filePattern}`,
      };
    }

    // Analyze each test file
    const testDetails: TestSuiteAnalysisResult['testDetails'] = [];
    const breakdown = {
      shouldBeUnit: 0,
      shouldBeIntegration: 0,
      shouldBeE2E: 0,
    };

    for (const filePath of testFiles) {
      const code = fs.readFileSync(filePath, 'utf-8');

      // Extract all test descriptions from the file
      const descriptions = extractAllTestDescriptions(code);

      if (descriptions.length === 0) {
        // If no descriptions found, analyze the file as a whole
        const result = await scoutAnalyzeTestSuitability({
          testDescription: path.basename(filePath),
          testCode: code,
          context: 'cypress_migration',
        });

        if (result.success && result.data) {
          testDetails.push({
            filePath: path.relative(cypressTestDirectory, filePath),
            testDescription: path.basename(filePath),
            recommendedType: result.data.recommendedType,
            confidence: result.data.confidence,
            reasoning: result.data.reasoning,
          });

          const key = `shouldBe${capitalize(
            result.data.recommendedType
          )}` as keyof typeof breakdown;
          breakdown[key]++;
        }
      } else {
        // Analyze each test description
        for (const description of descriptions) {
          const result = await scoutAnalyzeTestSuitability({
            testDescription: description,
            testCode: code,
            context: 'cypress_migration',
          });

          if (result.success && result.data) {
            testDetails.push({
              filePath: path.relative(cypressTestDirectory, filePath),
              testDescription: description,
              recommendedType: result.data.recommendedType,
              confidence: result.data.confidence,
              reasoning: result.data.reasoning.slice(0, 3), // First 3 reasons
            });

            const key = `shouldBe${capitalize(
              result.data.recommendedType
            )}` as keyof typeof breakdown;
            breakdown[key]++;
          }
        }
      }
    }

    // Detect shared dependencies
    const sharedDependencies = detectSharedDependencies(testFiles);

    // Generate migration order (prioritize by ease of migration)
    const migrationOrder = generateMigrationOrder(testDetails);

    // Estimate total effort
    const estimatedEffort = estimateTotalEffort(breakdown, testDetails.length);

    // Generate summary
    const summary = generateSummary(breakdown, testFiles.length, estimatedEffort);

    return {
      success: true,
      data: {
        totalTests: testDetails.length,
        breakdown,
        testDetails,
        sharedDependencies,
        migrationOrder,
        estimatedEffort,
        summary,
      },
      message: `Analyzed ${testFiles.length} test file(s) with ${testDetails.length} test case(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Find test files matching pattern in directory (recursive)
 */
function findTestFiles(dir: string, pattern: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...findTestFiles(fullPath, pattern));
      }
    } else if (entry.isFile()) {
      // Check if file matches pattern
      if (pattern.includes('*')) {
        // Simple glob matching for .cy.ts/.cy.js files
        if (entry.name.endsWith('.cy.ts') || entry.name.endsWith('.cy.js')) {
          files.push(fullPath);
        }
      } else if (entry.name === pattern) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Detect shared dependencies across test files
 */
function detectSharedDependencies(testFiles: string[]): string[] {
  const dependencies = new Set<string>();

  for (const filePath of testFiles) {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');

      // Detect common imports
      const importMatches = code.matchAll(/import.*from ['"](.+)['"]/g);
      for (const match of importMatches) {
        const importPath = match[1];
        // Only track relative imports (likely shared utilities)
        if (importPath.startsWith('.')) {
          dependencies.add(importPath);
        }
      }

      // Detect custom commands
      const customCommandMatches = code.matchAll(/cy\.([a-zA-Z_]+)\(/g);
      for (const match of customCommandMatches) {
        const command = match[1];
        // Filter out built-in commands
        const builtInCommands = [
          'visit',
          'get',
          'click',
          'type',
          'should',
          'request',
          'intercept',
          'task',
          'wait',
        ];
        if (!builtInCommands.includes(command)) {
          dependencies.add(`custom command: ${command}`);
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return Array.from(dependencies).slice(0, 20); // Limit to top 20
}

/**
 * Generate migration order (prioritize E2E tests, then integration, then unit)
 */
function generateMigrationOrder(testDetails: TestSuiteAnalysisResult['testDetails']): string[] {
  // Group by file and recommended type
  const fileGroups = new Map<string, { e2e: number; integration: number; unit: number }>();

  for (const test of testDetails) {
    if (!fileGroups.has(test.filePath)) {
      fileGroups.set(test.filePath, { e2e: 0, integration: 0, unit: 0 });
    }
    const group = fileGroups.get(test.filePath)!;
    group[test.recommendedType]++;
  }

  // Sort files: E2E first (Scout migration), then integration, then unit
  const sortedFiles = Array.from(fileGroups.entries()).sort(([, a], [, b]) => {
    // Prioritize files with more E2E tests
    if (a.e2e !== b.e2e) return b.e2e - a.e2e;
    // Then files with more integration tests
    if (a.integration !== b.integration) return b.integration - a.integration;
    // Finally unit tests
    return b.unit - a.unit;
  });

  return sortedFiles.map(([filePath, counts]) => {
    const types: string[] = [];
    if (counts.e2e > 0) types.push(`${counts.e2e} E2E`);
    if (counts.integration > 0) types.push(`${counts.integration} integration`);
    if (counts.unit > 0) types.push(`${counts.unit} unit`);
    return `${filePath} (${types.join(', ')})`;
  });
}

/**
 * Estimate total migration effort
 */
function estimateTotalEffort(
  breakdown: TestSuiteAnalysisResult['breakdown'],
  totalTests: number
): string {
  // Rough estimates: E2E = 2hrs, Integration = 1hr, Unit = 0.5hr per test
  const hours =
    breakdown.shouldBeE2E * 2 + breakdown.shouldBeIntegration * 1 + breakdown.shouldBeUnit * 0.5;

  if (hours < 8) {
    return `~${Math.ceil(hours)} hours (less than 1 day)`;
  } else if (hours < 40) {
    return `~${Math.ceil(hours / 8)} days`;
  } else {
    return `~${Math.ceil(hours / 40)} weeks`;
  }
}

/**
 * Generate summary text
 */
function generateSummary(
  breakdown: TestSuiteAnalysisResult['breakdown'],
  fileCount: number,
  effort: string
): string {
  const total = breakdown.shouldBeE2E + breakdown.shouldBeIntegration + breakdown.shouldBeUnit;

  return `Analyzed ${fileCount} file(s) with ${total} test(s):
- ${breakdown.shouldBeE2E} should remain E2E (migrate to Scout)
- ${breakdown.shouldBeIntegration} should become integration tests
- ${breakdown.shouldBeUnit} should become unit tests

Estimated effort: ${effort}

Recommendation: Start with E2E tests (Scout migration), then convert integration and unit tests.`;
}

/**
 * Helper to capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
