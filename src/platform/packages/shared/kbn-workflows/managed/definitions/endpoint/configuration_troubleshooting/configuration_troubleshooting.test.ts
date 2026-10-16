/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW,
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW,
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW,
} from '.';

interface WorkflowStep {
  name?: string;
  type?: string;
  if?: string;
  with?: Record<string, unknown>;
}

interface ParsedWorkflow {
  steps?: WorkflowStep[];
}

const parseWorkflow = (yaml: string): ParsedWorkflow => parse(yaml) as ParsedWorkflow;

const stepByName = (workflow: ParsedWorkflow, name: string): WorkflowStep | undefined =>
  workflow.steps?.find((step) => step.name === name);

const DIAGNOSE = parseWorkflow(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW.yaml);
const FIND = parseWorkflow(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW.yaml);

describe('endpoint configuration troubleshooting managed workflows', () => {
  it('is not billable, so it stays out of the billable workflow catalog', () => {
    expect(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_WORKFLOW.billable).toBe(false);
    expect(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_KNOWLEDGE_SEARCH_WORKFLOW.billable).toBe(false);
    expect(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_FIND_ARTIFACTS_WORKFLOW.billable).toBe(false);
  });

  it('emits only summaries, population and unauthorized from the find workflow', () => {
    expect(stepByName(FIND, 'emit')?.with).toEqual({
      summaries: '${{ steps.find.output.summaries }}',
      population: '${{ steps.find.output.population }}',
      unauthorized: '${{ steps.find.output.unauthorized }}',
    });
  });

  it('shares one include_configurations expression between package_status and finalize', () => {
    const packageStatus = stepByName(DIAGNOSE, 'package_status')?.with?.include_configurations;
    const finalize = stepByName(DIAGNOSE, 'finalize')?.with?.include_configurations;

    expect(typeof packageStatus).toBe('string');
    expect(packageStatus).toBe(finalize);
  });
});
