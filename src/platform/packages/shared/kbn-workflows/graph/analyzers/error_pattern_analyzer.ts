/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '../types';
import type { WorkflowGraph } from '../workflow_graph/workflow_graph';

/**
 * Types of error handling patterns that can be detected in a workflow
 */
export type ErrorPatternType =
  | 'retry' // Retry mechanism for transient failures
  | 'try-catch' // Try block with fallback path
  | 'on-failure' // Step-level on_failure handler
  | 'workflow-on-failure' // Workflow-level on_failure handler
  | 'timeout' // Timeout handling
  | 'continue-on-error'; // Continue execution despite errors

/**
 * Severity levels for error pattern issues
 */
export type ErrorPatternSeverity = 'error' | 'warning' | 'info';

/**
 * Represents a detected error handling pattern in the workflow
 */
export interface DetectedErrorPattern {
  /** Unique identifier for this pattern */
  id: string;
  /** The type of error handling pattern */
  type: ErrorPatternType;
  /** The step ID(s) where this pattern is applied */
  stepIds: string[];
  /** Human-readable description of the pattern */
  description: string;
  /** Configuration details for this pattern */
  configuration?: Record<string, unknown>;
}

/**
 * Represents an issue or recommendation related to error handling
 */
export interface ErrorPatternIssue {
  /** Unique identifier for this issue */
  id: string;
  /** Severity level */
  severity: ErrorPatternSeverity;
  /** The step ID(s) affected by this issue */
  stepIds: string[];
  /** Human-readable description of the issue */
  description: string;
  /** Recommendation for fixing or improving */
  recommendation: string;
}

/**
 * Result of the error pattern analysis
 */
export interface ErrorPatternAnalysisResult {
  /** All detected error handling patterns */
  patterns: DetectedErrorPattern[];
  /** Issues and recommendations */
  issues: ErrorPatternIssue[];
  /** Summary statistics */
  summary: ErrorPatternSummary;
}

/**
 * Summary statistics for error pattern analysis
 */
export interface ErrorPatternSummary {
  /** Total number of steps in the workflow */
  totalSteps: number;
  /** Number of steps with error handling */
  stepsWithErrorHandling: number;
  /** Number of steps without any error handling */
  stepsWithoutErrorHandling: number;
  /** Whether the workflow has a workflow-level on_failure handler */
  hasWorkflowLevelOnFailure: boolean;
  /** Count of each error pattern type */
  patternCounts: Record<ErrorPatternType, number>;
  /** Overall error resilience score (0-100) */
  resilienceScore: number;
}

/**
 * Node types that represent atomic/executable steps that could potentially fail
 */
const EXECUTABLE_NODE_TYPES = new Set([
  'atomic',
  'elasticsearch',
  'kibana',
  'http',
  'dataset',
  'wait',
]);

/**
 * Node types related to error handling
 */
const ERROR_HANDLING_NODE_TYPES = new Set([
  'enter-retry',
  'exit-retry',
  'enter-try-block',
  'exit-try-block',
  'enter-normal-path',
  'exit-normal-path',
  'enter-fallback-path',
  'exit-fallback-path',
  'enter-continue',
  'exit-continue',
  'enter-timeout-zone',
  'exit-timeout-zone',
  'on-failure',
  'step-level-on-failure',
  'workflow-level-on-failure',
]);

/**
 * Analyzes a workflow graph for error handling patterns.
 *
 * This analyzer identifies:
 * - Error handling mechanisms (retry, try-catch, on_failure)
 * - Steps that lack error handling
 * - Potential improvements to error resilience
 *
 * @example
 * ```typescript
 * const graph = WorkflowGraph.fromWorkflowDefinition(workflowDef);
 * const result = analyzeErrorPatterns(graph);
 *
 * if (result.issues.length > 0) {
 *   console.log('Error handling issues found:', result.issues);
 * }
 * ```
 */
export function analyzeErrorPatterns(workflowGraph: WorkflowGraph): ErrorPatternAnalysisResult {
  const nodes = workflowGraph.getAllNodes();

  // Detect all error handling patterns
  const patterns: DetectedErrorPattern[] = [];
  patterns.push(...detectRetryPatterns(workflowGraph, nodes));
  patterns.push(...detectTryCatchPatterns(workflowGraph, nodes));
  patterns.push(...detectOnFailurePatterns(workflowGraph, nodes));
  patterns.push(...detectTimeoutPatterns(workflowGraph, nodes));
  patterns.push(...detectContinueOnErrorPatterns(workflowGraph, nodes));

  // Analyze for issues and recommendations
  const issues = analyzeErrorHandlingIssues(workflowGraph, nodes, patterns);

  // Generate summary statistics
  const summary = generateSummary(workflowGraph, nodes, patterns);

  return {
    patterns,
    issues,
    summary,
  };
}

/**
 * Detects retry patterns in the workflow
 */
function detectRetryPatterns(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedErrorPattern[] {
  const patterns: DetectedErrorPattern[] = [];

  for (const node of nodes) {
    if (node.type === 'enter-retry') {
      const retryNode = node as GraphNodeUnion & {
        exitNodeId?: string;
        configuration?: {
          maxAttempts?: number;
          delay?: string;
          backoff?: string;
        };
      };

      patterns.push({
        id: `retry-${node.stepId}`,
        type: 'retry',
        stepIds: [node.stepId],
        description: `Retry mechanism for step "${node.stepId}"`,
        configuration: retryNode.configuration
          ? {
              maxAttempts: retryNode.configuration.maxAttempts,
              delay: retryNode.configuration.delay,
              backoff: retryNode.configuration.backoff,
            }
          : undefined,
      });
    }
  }

  return patterns;
}

/**
 * Detects try-catch (try block with fallback) patterns in the workflow
 */
function detectTryCatchPatterns(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedErrorPattern[] {
  const patterns: DetectedErrorPattern[] = [];
  const processedTryBlocks = new Set<string>();

  for (const node of nodes) {
    if (node.type === 'enter-try-block') {
      const tryBlockId = node.id;
      if (processedTryBlocks.has(tryBlockId)) {
        // eslint-disable-next-line no-continue
        continue;
      }
      processedTryBlocks.add(tryBlockId);

      // Find all steps within this try block
      const stepsInTryBlock = findStepsWithinScope(workflowGraph, node, 'exit-try-block');

      patterns.push({
        id: `try-catch-${node.stepId}`,
        type: 'try-catch',
        stepIds: [node.stepId, ...stepsInTryBlock],
        description: `Try-catch block for step "${node.stepId}" with fallback path`,
      });
    }
  }

  return patterns;
}

/**
 * Detects on_failure handler patterns in the workflow
 */
function detectOnFailurePatterns(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedErrorPattern[] {
  const patterns: DetectedErrorPattern[] = [];
  const detectedWorkflowOnFailureSteps = new Set<string>();

  for (const node of nodes) {
    if (node.type === 'step-level-on-failure') {
      patterns.push({
        id: `on-failure-step-${node.stepId}`,
        type: 'on-failure',
        stepIds: [node.stepId],
        description: `Step-level on_failure handler for "${node.stepId}"`,
      });
    }

    if (node.type === 'workflow-level-on-failure') {
      patterns.push({
        id: `on-failure-workflow-${node.stepId}`,
        type: 'workflow-on-failure',
        stepIds: [node.stepId],
        description: 'Workflow-level on_failure handler',
      });
    }

    // Detect workflow-level on-failure from node IDs
    // The graph builder creates fallback nodes with IDs prefixed with 'workflow-level-on-failure_'
    if (node.id.startsWith('workflow-level-on-failure_') && !detectedWorkflowOnFailureSteps.has(node.stepId)) {
      detectedWorkflowOnFailureSteps.add(node.stepId);
      patterns.push({
        id: `on-failure-workflow-${node.stepId}`,
        type: 'workflow-on-failure',
        stepIds: [node.stepId],
        description: 'Workflow-level on_failure handler',
      });
    }

    // Generic on-failure node
    if (node.type === 'on-failure') {
      patterns.push({
        id: `on-failure-${node.stepId}`,
        type: 'on-failure',
        stepIds: [node.stepId],
        description: `On-failure handler for "${node.stepId}"`,
      });
    }
  }

  return patterns;
}

/**
 * Detects timeout handling patterns in the workflow
 */
function detectTimeoutPatterns(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedErrorPattern[] {
  const patterns: DetectedErrorPattern[] = [];

  for (const node of nodes) {
    if (node.type === 'enter-timeout-zone') {
      const timeoutNode = node as GraphNodeUnion & {
        timeout?: string;
        stepType?: string;
      };

      const isWorkflowLevel = timeoutNode.stepType === 'workflow_level_timeout';

      patterns.push({
        id: `timeout-${node.stepId}-${isWorkflowLevel ? 'workflow' : 'step'}`,
        type: 'timeout',
        stepIds: [node.stepId],
        description: isWorkflowLevel
          ? 'Workflow-level timeout handler'
          : `Step-level timeout handler for "${node.stepId}"`,
        configuration: timeoutNode.timeout
          ? {
              timeout: timeoutNode.timeout,
              level: isWorkflowLevel ? 'workflow' : 'step',
            }
          : undefined,
      });
    }
  }

  return patterns;
}

/**
 * Detects continue-on-error patterns in the workflow
 */
function detectContinueOnErrorPatterns(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[]
): DetectedErrorPattern[] {
  const patterns: DetectedErrorPattern[] = [];

  for (const node of nodes) {
    if (node.type === 'enter-continue') {
      const continueNode = node as GraphNodeUnion & {
        configuration?: {
          condition?: string | boolean;
        };
      };

      patterns.push({
        id: `continue-${node.stepId}`,
        type: 'continue-on-error',
        stepIds: [node.stepId],
        description: `Continue-on-error for step "${node.stepId}"`,
        configuration: continueNode.configuration?.condition
          ? {
              condition: continueNode.configuration.condition,
            }
          : undefined,
      });
    }
  }

  return patterns;
}

/**
 * Analyzes the workflow for error handling issues and generates recommendations
 */
function analyzeErrorHandlingIssues(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[],
  patterns: DetectedErrorPattern[]
): ErrorPatternIssue[] {
  const issues: ErrorPatternIssue[] = [];

  // Get all executable steps
  const executableSteps = nodes.filter((node) => EXECUTABLE_NODE_TYPES.has(node.type));

  // Get step IDs that have error handling
  const stepsWithErrorHandling = new Set<string>();
  for (const pattern of patterns) {
    pattern.stepIds.forEach((stepId) => stepsWithErrorHandling.add(stepId));
  }

  // Check for workflow-level on_failure
  const hasWorkflowOnFailure = patterns.some((p) => p.type === 'workflow-on-failure');

  // Check for steps without error handling
  const unprotectedSteps: GraphNodeUnion[] = [];
  for (const step of executableSteps) {
    if (!stepsWithErrorHandling.has(step.stepId)) {
      // Check if step is within a try block or has implicit protection
      const hasImplicitProtection = checkImplicitProtection(workflowGraph, step);
      if (!hasImplicitProtection) {
        unprotectedSteps.push(step);
      }
    }
  }

  // Generate issues for unprotected steps
  if (unprotectedSteps.length > 0 && !hasWorkflowOnFailure) {
    const stepIds = unprotectedSteps.map((s) => s.stepId);

    if (unprotectedSteps.length === 1) {
      issues.push({
        id: `unprotected-step-${stepIds[0]}`,
        severity: 'warning',
        stepIds,
        description: `Step "${stepIds[0]}" has no error handling`,
        recommendation:
          'Consider adding a retry, on_failure handler, or wrapping in a try block to handle potential failures gracefully.',
      });
    } else if (unprotectedSteps.length > 5) {
      issues.push({
        id: 'many-unprotected-steps',
        severity: 'warning',
        stepIds,
        description: `${unprotectedSteps.length} steps have no explicit error handling`,
        recommendation:
          'Consider adding a workflow-level on_failure handler to catch any unhandled failures, or add error handling to critical steps.',
      });
    } else {
      issues.push({
        id: 'unprotected-steps',
        severity: 'warning',
        stepIds,
        description: `Steps without error handling: ${stepIds.join(', ')}`,
        recommendation:
          'Consider adding error handling to these steps or implementing a workflow-level on_failure handler.',
      });
    }
  }

  // Check for retry without backoff
  const retriesWithoutBackoff = patterns.filter(
    (p) =>
      p.type === 'retry' &&
      p.configuration?.maxAttempts &&
      (p.configuration.maxAttempts as number) > 2 &&
      !p.configuration?.backoff
  );

  for (const retry of retriesWithoutBackoff) {
    issues.push({
      id: `retry-no-backoff-${retry.stepIds[0]}`,
      severity: 'info',
      stepIds: retry.stepIds,
      description: `Retry for "${retry.stepIds[0]}" has multiple attempts but no backoff strategy`,
      recommendation:
        'Consider adding exponential backoff to avoid overwhelming external services during retry attempts.',
    });
  }

  // Check for HTTP/Elasticsearch steps without timeout
  const networkSteps = executableSteps.filter(
    (node) => node.type === 'elasticsearch' || node.type === 'http'
  );

  const timeoutProtectedSteps = new Set(
    patterns.filter((p) => p.type === 'timeout').flatMap((p) => p.stepIds)
  );

  const networkStepsWithoutTimeout = networkSteps.filter(
    (step) => !timeoutProtectedSteps.has(step.stepId)
  );

  if (networkStepsWithoutTimeout.length > 0) {
    const stepIds = networkStepsWithoutTimeout.map((s) => s.stepId);
    issues.push({
      id: 'network-steps-no-timeout',
      severity: 'info',
      stepIds,
      description: `Network-dependent steps without explicit timeout: ${stepIds.join(', ')}`,
      recommendation:
        'Consider adding timeout configuration to network-dependent steps to prevent workflows from hanging on unresponsive services.',
    });
  }

  return issues;
}

/**
 * Checks if a step has implicit protection from error handling scopes
 */
function checkImplicitProtection(workflowGraph: WorkflowGraph, node: GraphNodeUnion): boolean {
  const nodeStack = workflowGraph.getNodeStack(node.id);

  for (const stackNodeId of nodeStack) {
    const stackNode = workflowGraph.getNode(stackNodeId);
    if (stackNode && ERROR_HANDLING_NODE_TYPES.has(stackNode.type)) {
      return true;
    }
  }

  return false;
}

/**
 * Finds all step IDs within a scope defined by enter/exit node pairs
 */
function findStepsWithinScope(
  workflowGraph: WorkflowGraph,
  enterNode: GraphNodeUnion,
  exitNodeType: string
): string[] {
  const stepIds: string[] = [];
  const visited = new Set<string>();

  const collectSteps = (nodeId: string) => {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);

    const node = workflowGraph.getNode(nodeId);
    if (!node) {
      return;
    }

    // Stop at exit node
    if (node.type === exitNodeType) {
      return;
    }

    // Collect step ID if it's an executable node
    if (EXECUTABLE_NODE_TYPES.has(node.type) && node.stepId !== enterNode.stepId) {
      stepIds.push(node.stepId);
    }

    // Continue to successors
    const successors = workflowGraph.getDirectSuccessors(nodeId);
    for (const successor of successors) {
      collectSteps(successor.id);
    }
  };

  // Start from enter node's successors
  const startSuccessors = workflowGraph.getDirectSuccessors(enterNode.id);
  for (const successor of startSuccessors) {
    collectSteps(successor.id);
  }

  return [...new Set(stepIds)];
}

/**
 * Generates summary statistics for the error pattern analysis
 */
function generateSummary(
  workflowGraph: WorkflowGraph,
  nodes: GraphNodeUnion[],
  patterns: DetectedErrorPattern[]
): ErrorPatternSummary {
  const executableSteps = nodes.filter((node) => EXECUTABLE_NODE_TYPES.has(node.type));
  const totalSteps = executableSteps.length;

  // Count steps with error handling
  const stepsWithErrorHandling = new Set<string>();
  for (const pattern of patterns) {
    pattern.stepIds.forEach((stepId) => stepsWithErrorHandling.add(stepId));
  }

  // Also check for implicit protection
  for (const step of executableSteps) {
    if (!stepsWithErrorHandling.has(step.stepId)) {
      const hasImplicitProtection = checkImplicitProtection(workflowGraph, step);
      if (hasImplicitProtection) {
        stepsWithErrorHandling.add(step.stepId);
      }
    }
  }

  const stepsWithErrorHandlingCount = executableSteps.filter((step) =>
    stepsWithErrorHandling.has(step.stepId)
  ).length;

  const hasWorkflowLevelOnFailure = patterns.some((p) => p.type === 'workflow-on-failure');

  // Count pattern types
  const patternCounts: Record<ErrorPatternType, number> = {
    retry: 0,
    'try-catch': 0,
    'on-failure': 0,
    'workflow-on-failure': 0,
    timeout: 0,
    'continue-on-error': 0,
  };

  for (const pattern of patterns) {
    patternCounts[pattern.type]++;
  }

  // Calculate resilience score (0-100)
  const resilienceScore = calculateResilienceScore(
    totalSteps,
    stepsWithErrorHandlingCount,
    hasWorkflowLevelOnFailure,
    patternCounts
  );

  return {
    totalSteps,
    stepsWithErrorHandling: stepsWithErrorHandlingCount,
    stepsWithoutErrorHandling: totalSteps - stepsWithErrorHandlingCount,
    hasWorkflowLevelOnFailure,
    patternCounts,
    resilienceScore,
  };
}

/**
 * Calculates an error resilience score based on error handling coverage
 */
function calculateResilienceScore(
  totalSteps: number,
  stepsWithErrorHandling: number,
  hasWorkflowLevelOnFailure: boolean,
  patternCounts: Record<ErrorPatternType, number>
): number {
  if (totalSteps === 0) {
    return 100; // No steps to protect
  }

  let score = 0;

  // Base score from coverage (up to 50 points)
  const coverageRatio = stepsWithErrorHandling / totalSteps;
  score += coverageRatio * 50;

  // Bonus for workflow-level on_failure (20 points)
  if (hasWorkflowLevelOnFailure) {
    score += 20;
  }

  // Bonus for using diverse error handling strategies (up to 30 points)
  const diversityBonus = Math.min(
    30,
    (patternCounts.retry > 0 ? 8 : 0) +
      (patternCounts['try-catch'] > 0 ? 8 : 0) +
      (patternCounts['on-failure'] > 0 ? 6 : 0) +
      (patternCounts.timeout > 0 ? 8 : 0)
  );
  score += diversityBonus;

  return Math.round(Math.min(100, score));
}

/**
 * Gets a human-readable summary of the error pattern analysis
 */
export function getErrorPatternAnalysisSummary(result: ErrorPatternAnalysisResult): string {
  const lines: string[] = [];
  const { summary, patterns, issues } = result;

  lines.push('Error Pattern Analysis Summary:');
  lines.push(`  Total executable steps: ${summary.totalSteps}`);
  lines.push(`  Steps with error handling: ${summary.stepsWithErrorHandling}`);
  lines.push(`  Steps without error handling: ${summary.stepsWithoutErrorHandling}`);
  lines.push(`  Workflow-level on_failure: ${summary.hasWorkflowLevelOnFailure ? 'Yes' : 'No'}`);
  lines.push(`  Resilience score: ${summary.resilienceScore}/100`);

  if (Object.values(summary.patternCounts).some((count) => count > 0)) {
    lines.push('\nError handling patterns detected:');
    if (summary.patternCounts.retry > 0) {
      lines.push(`  - Retry: ${summary.patternCounts.retry}`);
    }
    if (summary.patternCounts['try-catch'] > 0) {
      lines.push(`  - Try-catch: ${summary.patternCounts['try-catch']}`);
    }
    if (summary.patternCounts['on-failure'] > 0) {
      lines.push(`  - On-failure (step): ${summary.patternCounts['on-failure']}`);
    }
    if (summary.patternCounts['workflow-on-failure'] > 0) {
      lines.push(`  - On-failure (workflow): ${summary.patternCounts['workflow-on-failure']}`);
    }
    if (summary.patternCounts.timeout > 0) {
      lines.push(`  - Timeout: ${summary.patternCounts.timeout}`);
    }
    if (summary.patternCounts['continue-on-error'] > 0) {
      lines.push(`  - Continue-on-error: ${summary.patternCounts['continue-on-error']}`);
    }
  }

  if (issues.length > 0) {
    lines.push('\nIssues and recommendations:');
    for (const issue of issues) {
      lines.push(`  [${issue.severity.toUpperCase()}] ${issue.description}`);
      lines.push(`    → ${issue.recommendation}`);
    }
  }

  return lines.join('\n');
}

/**
 * Validates that a workflow has adequate error handling.
 * Throws an error if critical issues are found.
 *
 * @param workflowGraph The workflow graph to validate
 * @param options Validation options
 * @throws Error if validation fails
 */
export function validateErrorHandling(
  workflowGraph: WorkflowGraph,
  options: {
    /** Minimum required resilience score (0-100) */
    minResilienceScore?: number;
    /** Require workflow-level on_failure handler */
    requireWorkflowOnFailure?: boolean;
  } = {}
): void {
  const result = analyzeErrorPatterns(workflowGraph);

  const { minResilienceScore = 0, requireWorkflowOnFailure = false } = options;

  const errors: string[] = [];

  if (result.summary.resilienceScore < minResilienceScore) {
    errors.push(
      `Resilience score ${result.summary.resilienceScore} is below minimum required ${minResilienceScore}`
    );
  }

  if (requireWorkflowOnFailure && !result.summary.hasWorkflowLevelOnFailure) {
    errors.push('Workflow-level on_failure handler is required but not present');
  }

  // Check for critical issues (errors severity)
  const criticalIssues = result.issues.filter((issue) => issue.severity === 'error');
  if (criticalIssues.length > 0) {
    errors.push(
      ...criticalIssues.map((issue) => `${issue.description}: ${issue.recommendation}`)
    );
  }

  if (errors.length > 0) {
    throw new Error(`Error handling validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  }
}
