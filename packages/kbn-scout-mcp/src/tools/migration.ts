/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cypress to Scout Migration Tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { scoutAnalyzeTestSuitability } from './test_analyzer';

export async function scoutAnalyzeCypressPatterns(params: {
  cypressTestCode: string;
  cypressTestPath?: string;
  workingDir?: string;
  checkCoverage?: boolean;
}) {
  try {
    const { cypressTestCode, cypressTestPath, workingDir, checkCoverage = false } = params;

    // First, analyze if this test should be E2E at all
    const testDescription = extractTestDescription(cypressTestCode);
    const suitabilityAnalysis = await scoutAnalyzeTestSuitability({
      testDescription,
      testCode: cypressTestCode,
      context: 'cypress_migration',
    });

    // Check coverage if requested
    let coverageAnalysis = null;
    if (checkCoverage) {
      const coverageResult = await scoutCheckTestCoverage({
        cypressTestCode,
        testDescription,
        cypressTestPath,
        workingDir,
      });
      if (coverageResult.success) {
        coverageAnalysis = coverageResult.data;
      }
    }

    const analysis = {
      selectors: [] as string[],
      actions: [] as string[],
      assertions: [] as string[],
      apiCalls: [] as string[],
      customCommands: [] as string[],
      imports: [] as string[],
      suggestions: [] as string[],
    };

    // Extract imports
    const importMatches = cypressTestCode.matchAll(/import .+ from ['"](.+)['"]/g);
    for (const match of importMatches) {
      analysis.imports.push(match[1]);
    }

    // Extract selectors
    const selectorMatches = cypressTestCode.matchAll(/cy\.get\(['"](.+?)['"]\)/g);
    for (const match of selectorMatches) {
      analysis.selectors.push(match[1]);
    }

    // Extract data-test-subj selectors
    const testSubjMatches = cypressTestCode.matchAll(/\[data-test-subj=["'](.+?)["']\]/g);
    for (const match of testSubjMatches) {
      analysis.suggestions.push(
        `Convert cy.get('[data-test-subj="${match[1]}"]') to page.testSubj.locator('${match[1]}')`
      );
    }

    // Extract actions
    if (cypressTestCode.includes('.click()')) {
      analysis.actions.push('click');
      analysis.suggestions.push('Convert .click() to await element.click()');
    }
    if (cypressTestCode.includes('.type(')) {
      analysis.actions.push('type');
      analysis.suggestions.push('Convert .type(text) to await element.fill(text)');
    }

    // Extract assertions
    if (cypressTestCode.includes('.should(')) {
      const shouldMatches = cypressTestCode.matchAll(/\.should\(['"](.+?)['"]/g);
      for (const match of shouldMatches) {
        analysis.assertions.push(match[1]);
      }
    }

    // Extract API calls
    if (cypressTestCode.includes('cy.request(')) {
      analysis.apiCalls.push('cy.request');
      analysis.suggestions.push('Convert cy.request() calls to API service methods in Scout');
    }
    if (cypressTestCode.includes('cy.task(')) {
      analysis.apiCalls.push('cy.task');
      analysis.suggestions.push('Convert cy.task() calls to API service methods in Scout');
    }

    // Extract custom commands
    const customCmdMatches = cypressTestCode.matchAll(/cy\.([a-zA-Z]+)\(/g);
    for (const match of importMatches) {
      if (!['get', 'visit', 'wait', 'request', 'task', 'should'].includes(match[1])) {
        analysis.customCommands.push(match[1]);
      }
    }

    // Generate migration plan
    const migrationPlan = {
      step1: 'Create API services for cy.request() and cy.task() calls',
      step2: 'Create page objects for screens and tasks',
      step3: 'Convert test structure (describe → test.describe, it → test)',
      step4: 'Convert selectors to Scout format',
      step5: 'Convert actions to async/await',
      step6: 'Convert assertions to expect()',
      step7: 'Add deployment tags',
      step8: 'Run and validate',
    };

    // Add warning if test might not be suitable for E2E
    let warning;
    if (
      suitabilityAnalysis.success &&
      suitabilityAnalysis.data &&
      suitabilityAnalysis.data.recommendedType !== 'e2e'
    ) {
      const confidence = suitabilityAnalysis.data.confidence;
      const recommendedType = suitabilityAnalysis.data.recommendedType;

      // Determine if we should strongly discourage Scout migration
      // High confidence + non-E2E recommendation = strongly discourage
      // Medium/Low confidence = warn but allow proceeding
      const shouldStronglyDiscourage = confidence === 'high';

      warning = {
        message: shouldStronglyDiscourage
          ? `🚫 This test should be a ${recommendedType} test, not an E2E test`
          : `⚠️ This test might be better as a ${recommendedType} test`,
        confidence,
        reasoning: suitabilityAnalysis.data.reasoning,
        alternatives: suitabilityAnalysis.data.alternativeApproaches,
        canProceedWithScout: !shouldStronglyDiscourage, // Only allow if not high confidence
        recommendedAction: shouldStronglyDiscourage
          ? `Use scout_suggest_test_conversion tool to get guidance on converting this to a ${recommendedType} test`
          : `Consider using scout_suggest_test_conversion tool for ${recommendedType} test guidance, or proceed with Scout migration if E2E is required`,
        estimatedSpeedImprovement: suitabilityAnalysis.data.estimatedSpeed,
        estimatedMaintenance: suitabilityAnalysis.data.estimatedMaintenance,
      };
    }

    return {
      success: true,
      data: {
        suitabilityAnalysis: suitabilityAnalysis.success ? suitabilityAnalysis.data : null,
        coverageAnalysis,
        warning,
        analysis,
        migrationPlan,
      },
      message: warning
        ? warning.canProceedWithScout
          ? `⚠️ Warning: ${warning.message}. Found ${analysis.selectors.length} selectors, ${analysis.actions.length} actions, ${analysis.apiCalls.length} API calls. ${warning.recommendedAction}`
          : `🚫 ${warning.message} (${warning.confidence} confidence). Found ${analysis.selectors.length} selectors, ${analysis.actions.length} actions, ${analysis.apiCalls.length} API calls. ${warning.recommendedAction}`
        : `Analyzed Cypress test: Found ${analysis.selectors.length} selectors, ${analysis.actions.length} actions, ${analysis.apiCalls.length} API calls`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function scoutConvertCypressCommand(params: { cypressCommand: string }) {
  try {
    const { cypressCommand } = params;

    const conversions: Record<string, string> = {
      'cy.get(\'[data-test-subj="x"]\')': "page.testSubj.locator('x')",
      'cy.get(\'[data-test-subj="x"]\').click()': "await page.testSubj.click('x')",
      "cy.get('[data-test-subj=\"x\"]').type('text')":
        "await page.testSubj.locator('x').fill('text')",
      "cy.visit('/app/security')": "await page.gotoApp('security')",
      ".should('be.visible')": 'await expect(element).toBeVisible()',
      ".should('not.be.visible')": 'await expect(element).not.toBeVisible()',
      ".should('have.text', 'text')": "await expect(element).toHaveText('text')",
      '.click()': 'await element.click()',
      ".type('text')": "await element.fill('text')",
      'cy.reload()': 'await page.reload()',
    };

    // Try exact match first
    let scoutEquivalent = conversions[cypressCommand];

    // If no exact match, try pattern matching
    if (!scoutEquivalent) {
      if (cypressCommand.includes('cy.get') && cypressCommand.includes('data-test-subj')) {
        const match = cypressCommand.match(/data-test-subj=["'](.+?)["']/);
        if (match) {
          scoutEquivalent = `page.testSubj.locator('${match[1]}')`;
        }
      } else if (cypressCommand.includes('cy.visit')) {
        const match = cypressCommand.match(/cy\.visit\(['"](.+?)['"]\)/);
        if (match) {
          const visitPath = match[1];
          if (visitPath.startsWith('/app/')) {
            const app = visitPath.split('/')[2];
            scoutEquivalent = `await page.gotoApp('${app}')`;
          }
        }
      } else if (cypressCommand.includes('cy.request')) {
        scoutEquivalent =
          'Create an API service method for this request (see Scout API service patterns)';
      } else if (cypressCommand.includes('cy.task')) {
        scoutEquivalent =
          'Create an API service method for this task (see Scout API service patterns)';
      }
    }

    if (!scoutEquivalent) {
      scoutEquivalent = 'No direct conversion available. Refer to migration mappings.';
    }

    return {
      success: true,
      data: {
        cypress: cypressCommand,
        scout: scoutEquivalent,
        explanation: getConversionExplanation(cypressCommand, scoutEquivalent),
      },
      message: `Converted Cypress command to Scout equivalent`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function scoutGenerateMigrationPlan(params: {
  cypressTestPath: string;
  testFiles?: string[];
}) {
  try {
    const { cypressTestPath, testFiles = [] } = params;

    const plan = {
      phase1: {
        title: 'Infrastructure Migration',
        tasks: [
          'Analyze Cypress tasks/api_calls directory',
          'Create Scout API service fixtures',
          'Analyze Cypress helpers',
          'Create Scout utility functions',
          'Analyze Cypress objects',
          'Create Scout constants/factories',
        ],
        estimatedTime: '1-2 weeks',
      },
      phase2: {
        title: 'Page Objects Migration',
        tasks: [
          'Analyze Cypress screens (selectors)',
          'Analyze Cypress tasks (UI actions)',
          'Design Scout page object architecture',
          'Create page object orchestrators',
          'Create specialized action classes',
          'Create locators classes',
          'Create assertions classes',
        ],
        estimatedTime: '1-2 weeks',
      },
      phase3: {
        title: 'Test Migration',
        tasks: [
          'Migrate simple tests first (feature availability)',
          'Migrate core functionality tests',
          'Migrate complex tests (with custom commands)',
          'Add deployment tags to all tests',
          'Validate tests pass consistently (3+ times)',
        ],
        estimatedTime: '2-4 weeks',
      },
      dependencies: {
        apiServices: [] as string[],
        pageObjects: [] as string[],
        utilities: [] as string[],
      },
      testingStrategy: {
        approach: 'Bottom-up (infrastructure → page objects → tests)',
        validation: [
          'Run linter on all generated code',
          'Run type checker',
          'Run each test 3+ times to ensure stability',
          'Validate against migration checklist',
        ],
      },
    };

    return {
      success: true,
      data: plan,
      message: `Generated migration plan for ${testFiles.length || 'all'} test files`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract test description from Cypress code
 */
function extractTestDescription(cypressCode: string): string {
  // Try to extract from describe() or it() blocks
  const describeMatch = cypressCode.match(/describe\(['"](.+?)['"]/);
  const itMatch = cypressCode.match(/it\(['"](.+?)['"]/);

  if (describeMatch && itMatch) {
    return `${describeMatch[1]}: ${itMatch[1]}`;
  }
  if (describeMatch) {
    return describeMatch[1];
  }
  if (itMatch) {
    return itMatch[1];
  }

  // Fallback: try to infer from actions
  if (cypressCode.includes('cy.visit') && cypressCode.includes('cy.request')) {
    return 'Test that combines UI and API interactions';
  }
  if (cypressCode.includes('cy.request') && !cypressCode.includes('cy.visit')) {
    return 'Test that only makes API calls';
  }

  return 'Cypress test';
}

function getConversionExplanation(cypress: string, scout: string): string {
  if (cypress.includes('data-test-subj')) {
    return 'Scout provides testSubj helper for cleaner data-test-subj selectors';
  }
  if (cypress.includes('cy.visit')) {
    return 'Scout uses gotoApp() for Kibana app navigation';
  }
  if (cypress.includes('.should')) {
    return 'Scout uses Playwright expect() assertions with async/await';
  }
  if (cypress.includes('cy.request')) {
    return 'Scout uses API service fixtures for backend operations';
  }
  return 'Convert to async/await pattern';
}

/**
 * Migration Risk Assessment Tool
 *
 * Assesses the difficulty and risk factors of migrating a Cypress test to Scout
 */

import { analyzeCodeWithAST, shouldUseAST } from '../utils/ast_parser';

export interface MigrationRiskResult {
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  requiredDependencies: {
    apiServices: string[];
    pageObjects: string[];
    utilities: string[];
  };
  riskFactors: string[];
  migrationStrategy: string;
  canRunInParallel: boolean;
  blockers: string[];
}

export async function scoutAssessMigrationRisk(params: { cypressTestCode: string }) {
  try {
    const { cypressTestCode } = params;

    // Perform deep analysis if code is complex
    let analysis = null;
    if (shouldUseAST(cypressTestCode)) {
      analysis = analyzeCodeWithAST(cypressTestCode);
    }

    // Extract dependencies
    const requiredDependencies = extractRequiredDependencies(cypressTestCode);

    // Assess difficulty
    const difficulty = assessDifficulty(cypressTestCode, analysis);

    // Estimate effort
    const estimatedHours = estimateEffort(difficulty, cypressTestCode, analysis);

    // Identify risk factors
    const riskFactors = identifyRiskFactors(cypressTestCode, analysis);

    // Identify blockers
    const blockers = identifyBlockers(cypressTestCode, analysis);

    // Determine parallel execution suitability
    const canRunInParallel = assessParallelSuitability(cypressTestCode, analysis);

    // Generate migration strategy
    const migrationStrategy = generateMigrationStrategy(
      difficulty,
      requiredDependencies,
      riskFactors
    );

    return {
      success: true,
      data: {
        difficulty,
        estimatedHours,
        requiredDependencies,
        riskFactors,
        migrationStrategy,
        canRunInParallel,
        blockers,
      },
      message: `Migration difficulty: ${difficulty} (estimated ${estimatedHours} hours)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function extractRequiredDependencies(code: string): {
  apiServices: string[];
  pageObjects: string[];
  utilities: string[];
} {
  const dependencies = {
    apiServices: [] as string[],
    pageObjects: [] as string[],
    utilities: [] as string[],
  };

  // Detect API calls that need service fixtures
  if (code.includes('cy.request') || code.includes('/api/')) {
    const apiMatches = code.matchAll(/['"]\/api\/([a-zA-Z_/]+)['"]/g);
    for (const match of apiMatches) {
      dependencies.apiServices.push(`API service for ${match[1]}`);
    }
  }

  // Detect UI interactions that need page objects
  const pageIndicators = [
    'navigate',
    'workflow',
    'dashboard',
    'alerts',
    'rules',
    'cases',
    'timeline',
  ];
  for (const indicator of pageIndicators) {
    if (code.toLowerCase().includes(indicator)) {
      dependencies.pageObjects.push(`${indicator} page object`);
    }
  }

  // Detect utilities
  if (code.includes('cy.task')) {
    dependencies.utilities.push('Task utilities (may need alternative in Scout)');
  }
  if (code.includes('cy.intercept')) {
    dependencies.utilities.push('Request interception (use Playwright route)');
  }

  return dependencies;
}

function assessDifficulty(code: string, analysis: any): 'easy' | 'medium' | 'hard' {
  let complexityScore = 0;

  // Check for custom commands (use AST or fallback to regex)
  let customCommandCount = analysis?.hasCustomCommands || 0;
  if (!customCommandCount) {
    // Regex-based custom command detection
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
      'then',
      'wrap',
    ];
    const customCommands =
      customCommandMatches?.filter((cmd) => {
        const cmdName = cmd.replace('cy.', '').replace('(', '');
        return !standardCommands.includes(cmdName);
      }) || [];
    customCommandCount = customCommands.length;
  }
  if (customCommandCount > 5) complexityScore += 3;
  else if (customCommandCount >= 2)
    complexityScore += 2; // Multiple custom commands add more complexity
  else if (customCommandCount > 0) complexityScore += 1;

  // Check for number of steps (use AST or count code lines)
  const stepCount =
    analysis?.numberOfSteps || code.split('\n').filter((line) => line.trim()).length;
  if (stepCount > 20) complexityScore += 4; // Very long tests are harder
  else if (stepCount > 10) complexityScore += 1;

  // Check for hard waits
  if (analysis?.hasHardWaits) complexityScore += 2;

  // Check for intercepts
  if (analysis?.hasIntercepts && analysis.hasIntercepts > 0) complexityScore += 1;

  // Check for task calls
  if (analysis?.hasTaskCalls && analysis.hasTaskCalls > 0) complexityScore += 2;

  // Check for complex selectors
  if (analysis?.hasBrittleSelectors) complexityScore += 1;

  if (complexityScore >= 6) return 'hard';
  if (complexityScore >= 3) return 'medium';
  return 'easy';
}

function estimateEffort(difficulty: string, code: string, analysis: any): number {
  const baseHours = {
    easy: 1,
    medium: 2,
    hard: 4,
  };

  let hours = baseHours[difficulty as keyof typeof baseHours];

  // Add time for page objects
  const pageObjectsNeeded = (code.match(/cy\.get/g) || []).length / 5;
  hours += pageObjectsNeeded * 0.5;

  // Add time for API services
  const apiServicesNeeded = (code.match(/cy\.request/g) || []).length;
  hours += apiServicesNeeded * 0.3;

  // Add time for custom commands (use AST if available, otherwise regex)
  let customCommandCount = analysis?.hasCustomCommands || 0;
  if (!customCommandCount) {
    // Regex-based detection
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
      'then',
      'wrap',
    ];
    const customCommands =
      customCommandMatches?.filter((cmd) => {
        const cmdName = cmd.replace('cy.', '').replace('(', '');
        return !standardCommands.includes(cmdName);
      }) || [];
    customCommandCount = customCommands.length;
  }
  hours += customCommandCount * 0.5;

  return Math.ceil(hours);
}

function identifyRiskFactors(code: string, analysis: any): string[] {
  const risks: string[] = [];

  // Use AST analysis if available, otherwise use regex
  if (analysis?.hasCustomCommands && analysis.hasCustomCommands > 0) {
    risks.push(
      `${analysis.hasCustomCommands} custom command(s) - need to understand and reimplement`
    );
  } else {
    // Regex-based custom command detection
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
      'then',
      'wrap',
    ];
    const customCommands =
      customCommandMatches?.filter((cmd) => {
        const cmdName = cmd.replace('cy.', '').replace('(', '');
        return !standardCommands.includes(cmdName);
      }) || [];

    if (customCommands.length > 0) {
      risks.push(`${customCommands.length} custom command(s) - need to understand and reimplement`);
    }
  }

  // Hard waits detection
  if (analysis?.hasHardWaits || /cy\.wait\(\s*\d+\s*\)/.test(code)) {
    risks.push('Hard waits detected - may cause flakiness, need proper wait strategies');
  }

  // Brittle selectors detection
  if (
    analysis?.hasBrittleSelectors ||
    /cy\.get\(['"]\s*[.#]|cy\.get\(['"]\s*\w+\s*['"]\)/.test(code)
  ) {
    risks.push('Brittle selectors - may break easily, need robust selectors');
  }

  if (code.includes('cy.task')) {
    risks.push('cy.task usage - may require alternative approach in Scout');
  }

  // Intercepts detection
  const interceptCount = (code.match(/cy\.intercept\(/g) || []).length;
  if ((analysis?.hasIntercepts && analysis.hasIntercepts > 3) || interceptCount > 3) {
    risks.push('Heavy use of intercepts - complex network mocking needs careful migration');
  }

  if (code.includes('before(') && !code.includes('beforeEach(')) {
    risks.push(
      'Global before() hooks - may create state dependencies between tests (use beforeEach)'
    );
  }

  return risks;
}

function identifyBlockers(code: string, analysis: any): string[] {
  const blockers: string[] = [];

  // Cypress-specific features with no direct Scout equivalent
  if (code.includes('cy.session')) {
    blockers.push('cy.session() - Scout handles auth differently with browserAuth fixture');
  }

  if (code.includes('cy.origin')) {
    blockers.push('cy.origin() - Cross-origin testing may need different approach');
  }

  if (code.includes('Cypress.env')) {
    blockers.push('Cypress.env() - Use Scout config or environment variables instead');
  }

  if (code.includes('cy.clock') || code.includes('cy.tick')) {
    blockers.push('cy.clock()/cy.tick() - Time mocking needs alternative approach in Playwright');
  }

  return blockers;
}

function assessParallelSuitability(code: string, analysis: any): boolean {
  // Tests can run in parallel if they don't have shared state

  // Check for global hooks (bad for parallel)
  if (code.includes('before(') && !code.includes('beforeEach(')) {
    return false;
  }

  // Check for shared data without isolation
  if (code.includes('fixture') && !code.includes('unique')) {
    return false;
  }

  // Check for database operations without cleanup
  if (code.includes('cy.task') && !code.includes('after')) {
    return false;
  }

  return true; // Default to true - Scout encourages parallel execution
}

function generateMigrationStrategy(
  difficulty: string,
  dependencies: MigrationRiskResult['requiredDependencies'],
  risks: string[]
): string {
  const steps: string[] = [];

  // Step 1: Dependencies
  if (
    dependencies.apiServices.length > 0 ||
    dependencies.pageObjects.length > 0 ||
    dependencies.utilities.length > 0
  ) {
    steps.push('1. Create required infrastructure:');
    if (dependencies.apiServices.length > 0) {
      steps.push(`   - API services: ${dependencies.apiServices.join(', ')}`);
    }
    if (dependencies.pageObjects.length > 0) {
      steps.push(`   - Page objects: ${dependencies.pageObjects.join(', ')}`);
    }
    if (dependencies.utilities.length > 0) {
      steps.push(`   - Utilities: ${dependencies.utilities.join(', ')}`);
    }
  }

  // Step 2: Address risks
  if (risks.length > 0) {
    steps.push('\n2. Address risk factors before migration:');
    risks.slice(0, 3).forEach((risk, i) => {
      steps.push(`   - ${risk}`);
    });
  }

  // Step 3: Migration approach
  steps.push('\n3. Migration approach:');
  if (difficulty === 'easy') {
    steps.push('   - Direct conversion of Cypress commands to Scout/Playwright');
    steps.push('   - Use scoutConvertCypressCommand tool for common patterns');
  } else if (difficulty === 'medium') {
    steps.push('   - Break down test into logical sections');
    steps.push('   - Migrate page interactions to page objects');
    steps.push('   - Convert API calls to service fixtures');
  } else {
    steps.push('   - RECOMMENDED: Consider splitting into multiple smaller tests');
    steps.push('   - Refactor complex logic before migration');
    steps.push('   - Break down into smaller, focused test cases');
    steps.push('   - Build page objects incrementally');
    steps.push('   - Test each section independently');
  }

  steps.push('\n4. Validation:');
  steps.push('   - Verify test runs in isolation');
  steps.push('   - Verify test runs in parallel with other tests');
  steps.push('   - Check test reliability (run 3+ times)');

  return steps.join('\n');
}

/**
 * Test Conversion Guidance Tool
 *
 * Suggests how to convert a Cypress test to unit/integration tests (not Scout E2E)
 */

export interface TestConversionResult {
  shouldSplit: boolean;
  unitTestGuidance?: {
    description: string;
    approach: string;
    structure: string;
    examplePattern: string;
  };
  integrationTestGuidance?: {
    description: string;
    approach: string;
    structure: string;
    examplePattern: string;
  };
  e2eTestGuidance?: {
    description: string;
    approach: string;
    structure: string;
    examplePattern: string;
  };
  reasoning: string;
}

export async function scoutSuggestTestConversion(params: {
  cypressTestCode: string;
  testDescription: string;
}) {
  try {
    const { cypressTestCode, testDescription } = params;

    // Analyze what the test does
    const analysis = analyzeTestPurpose(cypressTestCode);

    // Determine if test should be split
    const shouldSplit = analysis.hasMultipleConcerns;

    const result: TestConversionResult = {
      shouldSplit,
      reasoning: analysis.reasoning,
    };

    // Generate guidance for unit tests
    if (analysis.hasBusinessLogic || analysis.hasDataTransformation) {
      result.unitTestGuidance = {
        description: 'Extract business logic and data transformation into unit tests',
        approach:
          'Isolate pure functions and test them independently with Jest. Focus on input/output validation without external dependencies.',
        structure: `
describe('${testDescription} - Business Logic', () => {
  it('should calculate/transform data correctly', () => {
    // Arrange: Set up test data
    // Act: Call the function
    // Assert: Verify the output
  });
});`,
        examplePattern: 'Use Jest for fast, isolated testing of business logic',
      };
    }

    // Generate guidance for integration tests
    if (analysis.hasApiCalls || analysis.hasBackendInteractions) {
      result.integrationTestGuidance = {
        description: 'Test API endpoints and service integration without UI',
        approach:
          'Use FTR (Functional Test Runner) with supertest to test API endpoints directly. This is faster and more reliable than E2E for API validation.',
        structure: `
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('${testDescription} - API Integration', () => {
    it('should handle API operations correctly', async () => {
      const response = await supertest
        .post('/api/endpoint')
        .send({ data })
        .expect(200);

      expect(response.body).toMatchObject({ expected });
    });
  });
}`,
        examplePattern: 'Use FTR + supertest for API testing, focus on request/response validation',
      };
    }

    // Generate guidance for E2E (whenever there are UI interactions)
    if (analysis.hasUiInteractions) {
      result.e2eTestGuidance = {
        description: analysis.hasBusinessLogic
          ? 'Simplified E2E test focusing only on critical user flow'
          : 'E2E test for user interaction and UI validation',
        approach: analysis.hasBusinessLogic
          ? 'Extract business logic and API tests, keep only the essential UI validation in E2E. Use Scout for the remaining user journey.'
          : 'Use Scout to test the complete user journey through the UI. Focus on user interactions and visible state changes.',
        structure: `
import { expect, test } from '@kbn/scout';

test.describe('${testDescription} - User Flow', () => {
  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginWithRole('role');
    await page.gotoApp('app');
  });

  test('should complete critical user flow', async ({ pageObjects }) => {
    // Focus on user interactions and UI state validation
    ${
      analysis.hasBusinessLogic
        ? '// Business logic and API calls should be separate tests'
        : '// Test the complete user flow'
    }
  });
});`,
        examplePattern: 'Use Scout only for critical UI workflows, keep tests focused',
      };
    }

    return {
      success: true,
      data: result,
      message: shouldSplit
        ? 'Test should be split into multiple test types'
        : 'Test can be converted to a single test type',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function analyzeTestPurpose(code: string): {
  hasBusinessLogic: boolean;
  hasDataTransformation: boolean;
  hasApiCalls: boolean;
  hasBackendInteractions: boolean;
  hasUiInteractions: boolean;
  hasMultipleConcerns: boolean;
  reasoning: string;
} {
  const concerns: string[] = [];

  const hasBusinessLogic =
    code.includes('calculate') ||
    code.includes('validate') ||
    code.includes('transform') ||
    /const\s+\w+\s*=\s*\([^)]*\)\s*=>/g.test(code);

  const hasDataTransformation =
    code.includes('.map(') || code.includes('.filter(') || code.includes('.reduce(');

  const hasApiCalls = code.includes('cy.request') || code.includes('/api/');

  const hasBackendInteractions = code.includes('cy.task') || hasApiCalls;

  const hasUiInteractions =
    code.includes('cy.get') || code.includes('cy.visit') || code.includes('cy.click');

  // Build concerns list - be smart about what counts as "multiple"
  if (hasBusinessLogic) concerns.push('business logic');
  if (hasDataTransformation) concerns.push('data transformation');
  // Count backend as one concern (API + backend are same concern)
  if (hasBackendInteractions) concerns.push('backend operations');
  else if (hasApiCalls) concerns.push('API calls');
  if (hasUiInteractions) concerns.push('UI interactions');

  // Only consider it multiple concerns if there are truly different types
  // e.g., business logic + API, or data transformation + UI
  const hasMultipleConcerns =
    (hasBusinessLogic || hasDataTransformation) &&
    (hasApiCalls || hasBackendInteractions || hasUiInteractions);

  // Build more detailed reasoning
  let reasoning = '';
  if (hasMultipleConcerns) {
    reasoning = `Test has multiple concerns (${concerns.join(
      ', '
    )}). Consider splitting into separate tests for better maintainability and speed.`;
  } else {
    const concern = concerns[0] || 'general testing';
    // Add more specific details based on what was detected
    const details: string[] = [];
    if (hasBusinessLogic) details.push('business logic validation');
    if (hasDataTransformation) details.push('data transformation operations');
    if (hasApiCalls) details.push('API call interactions');
    if (hasBackendInteractions && !hasApiCalls) details.push('backend service interactions');
    if (hasUiInteractions) details.push('UI interaction flows');

    const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
    reasoning = `Test has a single concern${detailStr}. Can be converted to one test type.`;
  }

  return {
    hasBusinessLogic,
    hasDataTransformation,
    hasApiCalls,
    hasBackendInteractions,
    hasUiInteractions,
    hasMultipleConcerns,
    reasoning,
  };
}

/**
 * Test Coverage Analysis Tool
 *
 * Checks if functionality tested by a Cypress test is already covered
 * by existing unit, integration, or E2E tests.
 */

export interface TestCoverageResult {
  existingTests: Array<{
    type: 'unit' | 'integration' | 'e2e';
    path: string;
    covers: string[];
    testDescription?: string;
  }>;
  gaps: string[];
  recommendation: 'skip' | 'generate_unit' | 'generate_integration' | 'migrate_e2e' | 'split';
  reasoning: string;
}

export async function scoutCheckTestCoverage(params: {
  cypressTestCode: string;
  testDescription: string;
  cypressTestPath?: string;
  workingDir?: string;
}) {
  try {
    const {
      cypressTestCode,
      testDescription,
      cypressTestPath,
      workingDir = process.cwd(),
    } = params;

    // Extract what this test is testing
    const testPurpose = analyzeTestPurpose(cypressTestCode);
    const suitability = await scoutAnalyzeTestSuitability({
      testDescription,
      testCode: cypressTestCode,
      context: 'cypress_migration',
    });

    const recommendedType = suitability.success ? suitability.data?.recommendedType : 'e2e';

    // Search for existing tests
    const existingTests: TestCoverageResult['existingTests'] = [];

    // Extract keywords from test description and code
    const keywords = extractTestKeywords(testDescription, cypressTestCode);

    // Search for unit tests (Jest)
    const unitTests = await findExistingTests(workingDir, {
      patterns: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      keywords,
      excludePatterns: ['**/node_modules/**', '**/build/**', '**/dist/**'],
    });

    for (const test of unitTests) {
      existingTests.push({
        type: 'unit',
        path: test.path,
        covers: test.matchedKeywords,
        testDescription: test.description,
      });
    }

    // Search for integration tests (FTR)
    const integrationTests = await findExistingTests(workingDir, {
      patterns: [
        '**/api_integration/**/*.spec.ts',
        '**/integration/**/*.spec.ts',
        '**/*.integration.spec.ts',
      ],
      keywords,
      excludePatterns: ['**/node_modules/**', '**/build/**', '**/dist/**'],
    });

    for (const test of integrationTests) {
      existingTests.push({
        type: 'integration',
        path: test.path,
        covers: test.matchedKeywords,
        testDescription: test.description,
      });
    }

    // Search for E2E tests (Scout/Cypress)
    const e2eTests = await findExistingTests(workingDir, {
      patterns: ['**/*.e2e.spec.ts', '**/*.scout.spec.ts', '**/*.cy.ts'],
      keywords,
      excludePatterns: ['**/node_modules/**', '**/build/**', '**/dist/**'],
      excludePath: cypressTestPath, // Exclude the Cypress test we're analyzing
    });

    for (const test of e2eTests) {
      existingTests.push({
        type: 'e2e',
        path: test.path,
        covers: test.matchedKeywords,
        testDescription: test.description,
      });
    }

    // Determine gaps and recommendation
    const gaps: string[] = [];
    const coveredAspects = new Set<string>();

    // Check what's covered
    if (testPurpose.hasBusinessLogic) {
      const hasUnitCoverage = existingTests.some(
        (t) =>
          t.type === 'unit' && t.covers.some((c) => c.includes('logic') || c.includes('function'))
      );
      if (!hasUnitCoverage) {
        gaps.push('business logic');
      } else {
        coveredAspects.add('business logic');
      }
    }

    if (testPurpose.hasApiCalls || testPurpose.hasBackendInteractions) {
      const hasIntegrationCoverage = existingTests.some(
        (t) =>
          t.type === 'integration' &&
          t.covers.some((c) => c.includes('api') || c.includes('endpoint'))
      );
      if (!hasIntegrationCoverage) {
        gaps.push('API endpoints');
      } else {
        coveredAspects.add('API endpoints');
      }
    }

    if (testPurpose.hasUiInteractions) {
      const hasE2ECoverage = existingTests.some(
        (t) => t.type === 'e2e' && t.covers.some((c) => c.includes('ui') || c.includes('workflow'))
      );
      if (!hasE2ECoverage) {
        gaps.push('UI workflow');
      } else {
        coveredAspects.add('UI workflow');
      }
    }

    // Generate recommendation
    let recommendation: TestCoverageResult['recommendation'] = 'migrate_e2e';
    let reasoning = '';

    if (recommendedType === 'unit') {
      const hasUnitCoverage = existingTests.some((t) => t.type === 'unit');
      if (hasUnitCoverage) {
        recommendation = 'skip';
        reasoning = `Unit test already exists. This Cypress test is redundant. Consider deleting it.`;
      } else {
        recommendation = 'generate_unit';
        reasoning = `Should be a unit test and no unit test exists. Generate unit test instead of migrating to E2E.`;
      }
    } else if (recommendedType === 'integration') {
      const hasIntegrationCoverage = existingTests.some((t) => t.type === 'integration');
      if (hasIntegrationCoverage) {
        recommendation = 'skip';
        reasoning = `Integration test already exists. This Cypress test is redundant. Consider deleting it.`;
      } else {
        recommendation = 'generate_integration';
        reasoning = `Should be an integration test and no integration test exists. Generate integration test instead of migrating to E2E.`;
      }
    } else {
      // E2E recommended
      const hasE2ECoverage = existingTests.some((t) => t.type === 'e2e');
      if (hasE2ECoverage && gaps.length === 0) {
        recommendation = 'skip';
        reasoning = `E2E test already exists and covers the same functionality. This Cypress test may be redundant.`;
      } else if (testPurpose.hasMultipleConcerns) {
        recommendation = 'split';
        reasoning = `Test has multiple concerns. Consider splitting into unit/integration/E2E tests based on what's missing.`;
      } else {
        recommendation = 'migrate_e2e';
        reasoning = `E2E test is appropriate and ${
          gaps.length > 0 ? 'covers gaps in test coverage' : 'no duplicate E2E test found'
        }. Proceed with migration.`;
      }
    }

    return {
      success: true,
      data: {
        existingTests,
        gaps,
        recommendation,
        reasoning,
      },
      message: `Found ${existingTests.length} existing test(s). Recommendation: ${recommendation}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract keywords from test description and code
 */
function extractTestKeywords(description: string, code: string): string[] {
  const keywords: string[] = [];

  // Extract from description
  const descLower = description.toLowerCase();
  const commonWords = ['test', 'should', 'verify', 'check', 'validate', 'ensure'];
  const words = descLower.split(/[\s\-_]+/).filter((w) => w.length > 3 && !commonWords.includes(w));

  keywords.push(...words);

  // Extract API endpoints
  const apiMatches = code.matchAll(/['"]\/api\/([a-zA-Z_/]+)['"]/g);
  for (const match of apiMatches) {
    keywords.push(`api-${match[1]}`);
  }

  // Extract function/component names
  const functionMatches = code.matchAll(/(?:describe|it|test)\(['"](.+?)['"]/g);
  for (const match of functionMatches) {
    const testDesc = match[1].toLowerCase();
    const testWords = testDesc.split(/[\s\-_]+/).filter((w) => w.length > 3);
    keywords.push(...testWords);
  }

  // Extract data-test-subj values (UI elements)
  const testSubjMatches = code.matchAll(/data-test-subj=["'](.+?)["']/g);
  for (const match of testSubjMatches) {
    keywords.push(`ui-${match[1]}`);
  }

  return [...new Set(keywords)]; // Remove duplicates
}

/**
 * Find existing tests matching keywords
 */
async function findExistingTests(
  workingDir: string,
  options: {
    patterns: string[];
    keywords: string[];
    excludePatterns?: string[];
    excludePath?: string;
  }
): Promise<Array<{ path: string; matchedKeywords: string[]; description?: string }>> {
  const results: Array<{ path: string; matchedKeywords: string[]; description?: string }> = [];

  try {
    for (const pattern of options.patterns) {
      const files = await glob(pattern, {
        cwd: workingDir,
        ignore: options.excludePatterns || [],
        absolute: false,
      });

      for (const file of files) {
        const fullPath = path.resolve(workingDir, file);

        // Skip if this is the test we're analyzing
        if (options.excludePath && fullPath === path.resolve(workingDir, options.excludePath)) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const contentLower = content.toLowerCase();

          // Check if any keywords match
          const matchedKeywords: string[] = [];
          for (const keyword of options.keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
              matchedKeywords.push(keyword);
            }
          }

          if (matchedKeywords.length > 0) {
            // Extract test description
            const descMatch = content.match(/(?:describe|it|test)\(['"](.+?)['"]/);
            results.push({
              path: file,
              matchedKeywords,
              description: descMatch ? descMatch[1] : undefined,
            });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    }
  } catch (error) {
    // Return empty results if search fails
  }

  return results;
}

/**
 * Generate Unit or Integration Test
 *
 * Converts a Cypress test to an actual unit or integration test file
 * based on the test's purpose and recommended type.
 */

export interface GeneratedTestFile {
  testType: 'unit' | 'integration';
  filePath: string;
  testCode: string;
  imports: string[];
  dependencies?: string[];
}

export async function scoutGenerateUnitOrIntegrationTest(params: {
  cypressTestCode: string;
  testDescription: string;
  testType: 'unit' | 'integration';
  outputPath?: string;
  workingDir?: string;
}) {
  try {
    const {
      cypressTestCode,
      testDescription,
      testType,
      outputPath,
      workingDir = process.cwd(),
    } = params;

    // Get conversion guidance
    const conversionGuidance = await scoutSuggestTestConversion({
      cypressTestCode,
      testDescription,
    });

    if (!conversionGuidance.success || !conversionGuidance.data) {
      return {
        success: false,
        error: 'Failed to analyze test for conversion',
      };
    }

    let testCode = '';
    let imports: string[] = [];
    let dependencies: string[] = [];

    if (testType === 'unit') {
      // Generate unit test
      if (!conversionGuidance.data.unitTestGuidance) {
        return {
          success: false,
          error: 'This test does not appear suitable for unit testing',
        };
      }

      // Extract function/component name from test
      const functionName = extractFunctionName(cypressTestCode, testDescription);
      const testName = functionName || sanitizeTestName(testDescription);

      // Generate Jest test structure
      imports = ["import { describe, it, expect } from '@jest/globals';"];

      // Try to extract the actual function being tested
      const functionCode = extractFunctionCode(cypressTestCode);
      if (functionCode) {
        imports.push(`import { ${functionName} } from './path/to/${functionName}';`);
      }

      testCode = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

${imports.join('\n')}

describe('${testName}', () => {
  it('${testDescription}', () => {
    // Arrange: Set up test data
    const input = /* TODO: Add test input data */;

    // Act: Call the function
    const result = ${functionName}(input);

    // Assert: Verify the output
    expect(result).toBe(/* TODO: Add expected value */);
  });
});
`;

      dependencies = ['@jest/globals'];
    } else {
      // Generate integration test
      if (!conversionGuidance.data.integrationTestGuidance) {
        return {
          success: false,
          error: 'This test does not appear suitable for integration testing',
        };
      }

      // Extract API endpoints
      const apiEndpoints = extractApiEndpoints(cypressTestCode);
      const testName = sanitizeTestName(testDescription);

      imports = [
        "import { FtrProviderContext } from '../../ftr_provider_context';",
        "import { expect } from '@kbn/expect';",
      ];

      testCode = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

${imports.join('\n')}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('${testName}', () => {
    it('${testDescription}', async () => {
      // TODO: Convert Cypress API calls to supertest
      ${
        apiEndpoints.length > 0
          ? `// API endpoints found: ${apiEndpoints.join(', ')}`
          : '// No API endpoints detected'
      }

      const response = await supertest
        .post('/api/endpoint') // TODO: Update with actual endpoint
        .send({ data: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('expectedField');
    });
  });
}
`;

      dependencies = ['@kbn/expect'];
    }

    // Determine output path
    let finalPath = outputPath;
    if (!finalPath) {
      const fileName = sanitizeTestName(testDescription);
      const extension = testType === 'unit' ? '.test.ts' : '.integration.spec.ts';
      finalPath =
        testType === 'unit'
          ? `src/${fileName}${extension}`
          : `test/api_integration/${fileName}${extension}`;
    }

    return {
      success: true,
      data: {
        testType,
        filePath: finalPath,
        testCode,
        imports,
        dependencies,
        guidance: conversionGuidance.data,
      },
      message: `Generated ${testType} test code for "${testDescription}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper functions for test generation
 */
function extractFunctionName(code: string, description: string): string {
  // Try to find function calls in the code
  const functionMatch = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*(\w+)\(/);
  if (functionMatch) {
    return functionMatch[2];
  }

  // Try to extract from description
  const descMatch = description.match(/(\w+)\s*(?:function|method|component)/i);
  if (descMatch) {
    return descMatch[1];
  }

  return 'functionUnderTest';
}

function extractFunctionCode(code: string): string | null {
  // Try to find function definitions
  const functionMatch = code.match(
    /(?:function|const|export\s+const)\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/s
  );
  return functionMatch ? functionMatch[0] : null;
}

function extractApiEndpoints(code: string): string[] {
  const endpoints: string[] = [];
  const matches = code.matchAll(/['"]\/api\/([a-zA-Z_/]+)['"]/g);
  for (const match of matches) {
    endpoints.push(`/api/${match[1]}`);
  }
  return [...new Set(endpoints)];
}

function sanitizeTestName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}
