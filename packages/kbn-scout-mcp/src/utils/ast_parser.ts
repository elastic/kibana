/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@babel/parser';
import * as t from '@babel/types';

/**
 * Parses Cypress/TypeScript code into an AST
 * Falls back to graceful error handling if parsing fails
 */
export function parseCypressCode(code: string): t.File | null {
  try {
    return parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch (error) {
    // Parsing failed - return null to fall back to regex
    return null;
  }
}

/**
 * Deep code analysis results
 */
export interface DeepCodeAnalysis {
  hasOnlyApiCalls: boolean;
  hasOnlyDataValidation: boolean;
  testComplexity: 'simple' | 'medium' | 'complex';
  numberOfSteps: number;
  hasStateDependencies: boolean;
  requiresAuthentication: boolean;
  requiresDataSetup: boolean;
  hasCustomCommands: number;
  hasIntercepts: number;
  hasTaskCalls: number;
  uiInteractionCount: number;
  apiCallCount: number;
  assertionCount: number;
  hasHardWaits: boolean;
  hasBrittleSelectors: boolean;
  testHookCount: number;
}

/**
 * Performs deep AST-based analysis of Cypress code
 * This is more expensive than regex but more accurate
 */
export function analyzeCodeWithAST(code: string): Partial<DeepCodeAnalysis> {
  const ast = parseCypressCode(code);
  if (!ast) {
    // AST parsing failed - return empty object to fall back to regex
    return {};
  }

  const analysis: Partial<DeepCodeAnalysis> = {
    numberOfSteps: 0,
    hasCustomCommands: 0,
    hasIntercepts: 0,
    hasTaskCalls: 0,
    uiInteractionCount: 0,
    apiCallCount: 0,
    assertionCount: 0,
    hasHardWaits: false,
    hasBrittleSelectors: false,
    testHookCount: 0,
  };

  // Traverse AST and count patterns
  traverse(ast, {
    CallExpression(node: t.CallExpression) {
      // Detect cy.* calls
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.object)) {
        if (node.callee.object.name === 'cy') {
          const method = t.isIdentifier(node.callee.property) ? node.callee.property.name : null;

          if (method) {
            analysis.numberOfSteps!++;

            // Categorize call types
            if (method === 'request') {
              analysis.apiCallCount!++;
            } else if (method === 'task') {
              analysis.hasTaskCalls!++;
            } else if (method === 'intercept') {
              analysis.hasIntercepts!++;
            } else if (
              ['get', 'click', 'type', 'select', 'check', 'uncheck', 'clear'].includes(method)
            ) {
              analysis.uiInteractionCount!++;
            } else if (method === 'should' || method === 'expect') {
              analysis.assertionCount!++;
            } else if (method === 'wait') {
              // Check if it's a hard wait (number) or soft wait (alias)
              if (
                node.arguments.length > 0 &&
                t.isNumericLiteral(node.arguments[0]) &&
                node.arguments[0].value > 100
              ) {
                analysis.hasHardWaits = true;
              }
            }

            // Detect custom commands (not built-in)
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
              'fixture',
              'wrap',
              'contains',
              'find',
              'within',
              'as',
              'invoke',
              'trigger',
              'focus',
              'blur',
              'submit',
              'clear',
              'check',
              'uncheck',
              'select',
              'scrollIntoView',
              'scrollTo',
              'reload',
              'go',
              'url',
              'hash',
              'location',
              'title',
              'viewport',
              'window',
              'document',
              'readFile',
              'writeFile',
              'exec',
              'log',
              'screenshot',
            ];
            if (!builtInCommands.includes(method)) {
              analysis.hasCustomCommands!++;
            }
          }

          // Detect brittle selectors
          if (method === 'get' && node.arguments.length > 0) {
            const selector = node.arguments[0];
            if (t.isStringLiteral(selector)) {
              const selectorValue = selector.value;
              // Brittle selectors: ID, class, tag selectors without data-test-subj
              if (
                (selectorValue.startsWith('#') ||
                  selectorValue.startsWith('.') ||
                  /^[a-z]+$/i.test(selectorValue)) &&
                !selectorValue.includes('[data-test-subj')
              ) {
                analysis.hasBrittleSelectors = true;
              }
            }
          }
        }
      }

      // Detect test hooks
      if (t.isIdentifier(node.callee)) {
        const name = node.callee.name;
        if (['before', 'after', 'beforeEach', 'afterEach'].includes(name)) {
          analysis.testHookCount!++;
        }
      }
    },
  });

  // Determine complexity based on step count
  const steps = analysis.numberOfSteps!;
  if (steps <= 5) {
    analysis.testComplexity = 'simple';
  } else if (steps <= 15) {
    analysis.testComplexity = 'medium';
  } else {
    analysis.testComplexity = 'complex';
  }

  // Determine characteristics
  analysis.hasOnlyApiCalls = analysis.apiCallCount! > 0 && analysis.uiInteractionCount === 0;
  analysis.hasOnlyDataValidation =
    analysis.assertionCount! > 0 &&
    analysis.uiInteractionCount === 0 &&
    analysis.apiCallCount === 0;
  analysis.requiresAuthentication = code.includes('login') || code.includes('auth');
  analysis.requiresDataSetup = analysis.hasTaskCalls! > 0 || code.includes('fixture');
  analysis.hasStateDependencies = analysis.testHookCount! > 0 || analysis.hasIntercepts! > 0;

  return analysis;
}

/**
 * Simple AST traversal helper
 */
function traverse(ast: t.File, visitors: { CallExpression?: (node: t.CallExpression) => void }) {
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;

    // Call visitor for this node type
    if (t.isCallExpression(node) && visitors.CallExpression) {
      visitors.CallExpression(node);
    }

    // Recursively visit children
    for (const key in node) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach((c) => visit(c));
      } else if (child && typeof child === 'object') {
        visit(child);
      }
    }
  }

  visit(ast);
}

/**
 * Extract test description from Cypress code using AST
 * More reliable than regex for complex nested structures
 */
export function extractTestDescriptionFromAST(code: string): string | null {
  const ast = parseCypressCode(code);
  if (!ast) return null;

  let description: string | null = null;

  traverse(ast, {
    CallExpression(node: t.CallExpression) {
      if (description) return; // Already found

      if (t.isIdentifier(node.callee)) {
        const name = node.callee.name;
        if ((name === 'describe' || name === 'it') && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (t.isStringLiteral(firstArg)) {
            description = firstArg.value;
          }
        }
      }
    },
  });

  return description;
}

/**
 * Extract all test descriptions from a Cypress test file
 * Useful for batch analysis
 */
export function extractAllTestDescriptions(code: string): string[] {
  const ast = parseCypressCode(code);
  if (!ast) return [];

  const descriptions: string[] = [];

  traverse(ast, {
    CallExpression(node: t.CallExpression) {
      if (t.isIdentifier(node.callee)) {
        const name = node.callee.name;
        if (name === 'it' && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (t.isStringLiteral(firstArg)) {
            descriptions.push(firstArg.value);
          }
        }
      }
    },
  });

  return descriptions;
}

/**
 * Determines if AST parsing is needed for this code
 * Some patterns can be detected with simple regex, others need AST
 */
export function shouldUseAST(code: string): boolean {
  // Use AST if code has complex patterns:
  // - Multiple nested callbacks
  // - Custom commands
  // - Complex selector logic
  // - Intercepts with complex handling

  const complexPatterns = [
    /\.then\(.*\.then\(/s, // Nested promises
    /cy\.[a-zA-Z_]+\(.*\{/s, // Callbacks with blocks
    /cy\.intercept.*=>/s, // Intercepts with handlers
    /Cypress\.Commands\.add/, // Custom commands
    /\$\{.*cy\./s, // Templated cy calls
  ];

  return complexPatterns.some((pattern) => pattern.test(code));
}
