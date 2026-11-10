/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Harness for driving the real execution engine from a Jest integration test.
 *
 * Exposed so a plugin that contributes step definitions or a managed workflow
 * definition can assert how the engine actually executes it — park and resume
 * behaviour, loop control flow and variable survival are engine semantics, and
 * a YAML-shape unit test cannot reach them.
 *
 * Only usable from a Jest environment: the fixture mocks the execution
 * repositories at module scope, so importing it outside a test does nothing
 * useful.
 */
export {
  WorkflowRunFixture,
  type WorkflowRunFixtureOptions,
} from './integration_tests/workflow_run_fixture';

/**
 * Runs a shipped managed workflow with every outside boundary faked (custom steps,
 * Kibana and Elasticsearch steps, child workflows), and checks that a set of test
 * cases covers every step and branch of the workflow.
 */
export {
  runManagedWorkflow,
  type ElasticsearchCall,
  type FakeChildWorkflow,
  type FakeElasticsearchStep,
  type FakeKibanaStep,
  type FakeStep,
  type KibanaApiCall,
  type KibanaApiResponse,
  type ManagedWorkflowFakes,
  type ManagedWorkflowRun,
  type RecordedCall,
  type RunEnd,
} from './integration_tests/managed_workflow_harness';
export {
  describeBranchCoverage,
  managedWorkflow,
  matchesStepSchema,
  parseWorkflow,
  stepSchema,
  workflowInputErrors,
  type CoveredRun,
  type JsonSchema,
  type ParsedWorkflow,
  type YamlStep,
  type YamlWorkflow,
} from './integration_tests/workflow_coverage';
