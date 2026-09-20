/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { isStructurallyEmptyWorkflowYaml } from '../../../entities/workflows/store/workflow_detail/utils/is_structurally_empty_workflow_yaml';

/** Seed YAML for `/create` — empty structure so the visual builder shows the creation state. */
export const workflowDefaultYaml = `version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers: []
steps: []
`;

/**
 * Hello-world sample written when the user leaves the empty creation state via
 * "Edit as YAML". Toggling back to the graph shows this structure.
 */
export const workflowYamlEditorSeedYaml = `version: "1"
name: New workflow
enabled: false
description: This is a new workflow
triggers:
  - type: manual
    inputs:
      - name: message
        type: string
        default: "hello world"

steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ inputs.message }}"
`;
