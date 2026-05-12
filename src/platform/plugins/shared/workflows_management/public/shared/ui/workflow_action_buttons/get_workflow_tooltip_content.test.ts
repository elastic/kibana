/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getRunTooltipContent,
  getSaveWorkflowTooltipContent,
  getTestRunTooltipContent,
} from './get_workflow_tooltip_content';

describe('getRunTooltipContent', () => {
  it('returns invalid message when isValid is false', () => {
    const result = getRunTooltipContent({
      isValid: false,
      canRunWorkflow: true,
      isEnabled: true,
    });
    expect(result).toBe('Fix errors to run workflow');
  });

  it('returns not-allowed message when canRunWorkflow is false', () => {
    const result = getRunTooltipContent({
      isValid: true,
      canRunWorkflow: false,
      isEnabled: true,
    });
    expect(result).toBe('You are not allowed to run workflows');
  });

  it('returns disabled message when isEnabled is false', () => {
    const result = getRunTooltipContent({
      isValid: true,
      canRunWorkflow: true,
      isEnabled: false,
    });
    expect(result).toBe('Enable the workflow to run it');
  });

  it('returns null when all conditions are met', () => {
    const result = getRunTooltipContent({
      isValid: true,
      canRunWorkflow: true,
      isEnabled: true,
    });
    expect(result).toBeNull();
  });

  it('prioritizes isValid over canRunWorkflow and isEnabled', () => {
    const result = getRunTooltipContent({
      isValid: false,
      canRunWorkflow: false,
      isEnabled: false,
    });
    expect(result).toBe('Fix errors to run workflow');
  });

  it('prioritizes canRunWorkflow over isEnabled when isValid is true', () => {
    const result = getRunTooltipContent({
      isValid: true,
      canRunWorkflow: false,
      isEnabled: false,
    });
    expect(result).toBe('You are not allowed to run workflows');
  });
});

describe('getTestRunTooltipContent', () => {
  it('returns executions-tab message when isExecutionsTab is true', () => {
    const result = getTestRunTooltipContent({
      isValid: true,
      canRunWorkflow: true,
      isExecutionsTab: true,
    });
    expect(result).toBe('Can not run workflow from executions tab');
  });

  it('returns invalid message when isValid is false', () => {
    const result = getTestRunTooltipContent({
      isValid: false,
      canRunWorkflow: true,
      isExecutionsTab: false,
    });
    expect(result).toBe('Fix errors to run workflow');
  });

  it('returns execute privilege message when canRunWorkflow is false', () => {
    const result = getTestRunTooltipContent({
      isValid: true,
      canRunWorkflow: false,
      isExecutionsTab: false,
    });
    expect(result).toBe('You need the Workflows "Execute" privilege to run workflows.');
  });

  it('returns null when all conditions are met', () => {
    const result = getTestRunTooltipContent({
      isValid: true,
      canRunWorkflow: true,
      isExecutionsTab: false,
    });
    expect(result).toBeNull();
  });

  it('prioritizes isExecutionsTab over isValid', () => {
    const result = getTestRunTooltipContent({
      isValid: false,
      canRunWorkflow: false,
      isExecutionsTab: true,
    });
    expect(result).toBe('Can not run workflow from executions tab');
  });

  it('prioritizes isValid over canRunWorkflow when not on executions tab', () => {
    const result = getTestRunTooltipContent({
      isValid: false,
      canRunWorkflow: false,
      isExecutionsTab: false,
    });
    expect(result).toBe('Fix errors to run workflow');
  });
});

describe('getSaveWorkflowTooltipContent', () => {
  it('returns executions-tab message when isExecutionsTab is true', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: true,
      canSaveWorkflow: true,
      isCreate: false,
    });
    expect(result).toBe('Can not save workflow from executions tab');
  });

  it('returns not-allowed-create message when canSaveWorkflow is false and isCreate is true', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: false,
      canSaveWorkflow: false,
      isCreate: true,
    });
    expect(result).toBe('You are not allowed to create workflows');
  });

  it('returns not-allowed-update message when canSaveWorkflow is false and isCreate is false', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: false,
      canSaveWorkflow: false,
      isCreate: false,
    });
    expect(result).toBe('You are not allowed to update workflows');
  });

  it('returns null when all conditions are met', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: false,
      canSaveWorkflow: true,
      isCreate: false,
    });
    expect(result).toBeNull();
  });

  it('returns null when creating and allowed', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: false,
      canSaveWorkflow: true,
      isCreate: true,
    });
    expect(result).toBeNull();
  });

  it('prioritizes isExecutionsTab over canSaveWorkflow', () => {
    const result = getSaveWorkflowTooltipContent({
      isExecutionsTab: true,
      canSaveWorkflow: false,
      isCreate: true,
    });
    expect(result).toBe('Can not save workflow from executions tab');
  });
});
