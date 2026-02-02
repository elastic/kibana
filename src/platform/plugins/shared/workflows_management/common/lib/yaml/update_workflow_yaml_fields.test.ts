/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflow } from '@kbn/workflows';
import { updateWorkflowYamlFields } from './update_workflow_yaml_fields';

describe('updateWorkflowYamlFields', () => {
  it('should update enabled field', () => {
    const yaml = 'name: Test Workflow\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = { enabled: false };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('enabled: false');
    expect(result).not.toContain('enabled: true');
  });

  it('should update name field', () => {
    const yaml = 'name: Old Name\nsteps: []';
    const workflow: Partial<EsWorkflow> = { name: 'New Name' };

    const result = updateWorkflowYamlFields(yaml, workflow);

    expect(result).toContain('name: New Name');
    expect(result).not.toContain('name: Old Name');
  });

  it('should update multiple fields', () => {
    const yaml = 'name: Old Name\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = {
      name: 'New Name',
      enabled: false,
    };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('name: New Name');
    expect(result).toContain('enabled: false');
    expect(result).not.toContain('name: Old Name');
    expect(result).not.toContain('enabled: true');
  });

  it('should preserve comments and formatting', () => {
    const yaml = `# Comment
name: Test Workflow
# Another comment
enabled: true

steps: []`;
    const workflow: Partial<EsWorkflow> = { enabled: false };

    const result = updateWorkflowYamlFields(yaml, workflow, false);

    expect(result).toContain('# Comment');
    expect(result).toContain('# Another comment');
    expect(result).toContain('\n\n'); // Blank line preserved
    expect(result).toContain('enabled: false');
  });

  it('should use enabledValue parameter when provided', () => {
    const yaml = 'name: Test Workflow\nenabled: true\nsteps: []';
    const workflow: Partial<EsWorkflow> = { enabled: true }; // Request to enable
    const enabledValue = false; // But resolved value is false (e.g., due to validation)

    const result = updateWorkflowYamlFields(yaml, workflow, enabledValue);

    expect(result).toContain('enabled: false'); // Uses enabledValue, not workflow.enabled
  });
});
