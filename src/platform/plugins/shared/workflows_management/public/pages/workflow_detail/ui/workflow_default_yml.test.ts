/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isStructurallyEmptyWorkflowYaml,
  workflowDefaultYaml,
  workflowYamlEditorSeedYaml,
} from './workflow_default_yml';

describe('workflow default yaml helpers', () => {
  it('keeps create seed structurally empty', () => {
    expect(isStructurallyEmptyWorkflowYaml(workflowDefaultYaml)).toBe(true);
  });

  it('treats the YAML editor seed as structured', () => {
    expect(isStructurallyEmptyWorkflowYaml(workflowYamlEditorSeedYaml)).toBe(false);
    expect(workflowYamlEditorSeedYaml).toContain('hello_world_step');
    expect(workflowYamlEditorSeedYaml).toContain('type: manual');
  });
});
