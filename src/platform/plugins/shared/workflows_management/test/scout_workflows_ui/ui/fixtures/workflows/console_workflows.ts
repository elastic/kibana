/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal workflow with configurable properties for list-level tests (bulk actions, filtering, etc.).
 */
export const getListTestWorkflowYaml = ({
  name,
  description,
  enabled,
}: {
  name: string;
  description: string;
  enabled: boolean;
}) => `
name: ${name}
enabled: ${enabled}
description: ${description}
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    with:
      message: "Test run: {{ execution.isTestRun }}"
`;

/**
 * Simple workflow with a single console step that logs the isTestRun flag.
 * Used in test-run execution tests (saved, unsaved, disabled-then-enabled).
 */
export const getTestRunWorkflowYaml = (name: string) => `
name: ${name}
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
      message: "Test run: {{ execution.isTestRun }}"
`;

/**
 * Workflow with a foreach loop (4 items) and a nested console step.
 * Used for individual step run and context override tests.
 */
export const getWorkflowWithLoopYaml = (name: string) => `
name: ${name}
enabled: false
description: This is a new workflow
triggers:
  - type: manual

consts:
  loop_items: [{"@timestamp": "now"}, {"@timestamp": "yesterday"}, {"@timestamp": "tomorrow"}, {"@timestamp": "next week"}]

  inputs:
  - name: message
    type: string
    default: "hello world"

steps:
  - name: first_step
    type: console
    with:
      message: "This is the first step!"

  - name: loop
    type: foreach
    foreach: '{{consts.loop_items}}'
    steps:
      - name: hello_world_step
        type: console
        with:
          message: "Test run: {{ execution.isTestRun }}, timestamp: {{foreach.item['@timestamp']}}"
`;

/**
 * Workflow with a foreach loop (2 items) that logs the iteration index.
 * Used for verifying execution tree with foreach iterations.
 */
export const getIterationLoopWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
description: This is a new workflow
triggers:
  - type: manual

inputs:
  - name: message
    type: string
    default: "hello world"

steps:
  - name: first_step
    type: console
    with:
      message: "This is the first step!"

  - name: loop
    type: foreach
    foreach: '[1,2]'
    steps:
      - name: log_iteration
        type: console
        with:
          message: "Iteration is {{foreach.index}}"
`;

/**
 * Workflow with 50 foreach iterations for scroll/virtualization tests.
 */
export const getManyIterationsWorkflowYaml = (name: string) => `
name: ${name}
enabled: false
description: This is a new workflow
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    foreach: '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]'
    with:
      message: "Hello world"
`;

/**
 * Simple enabled workflow that echoes its message input.
 * Used for editor sanity tests (create, save, run, validate).
 */
export const getDummyWorkflowYaml = (name: string) => `
name: ${name}
description: Dummy workflow description
enabled: true
inputs:
  - name: message
    type: string
    default: "hello world"
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type: console
    with:
      message: "{{ inputs.message }}"
`;

/**
 * Invalid workflow YAML missing the required "steps" property.
 * Used for validation error tests.
 */
export const getInvalidWorkflowYaml = (name: string) => `
name: ${name}
description: Invalid workflow - missing steps
enabled: true
triggers:
  - type: manual
`;

/**
 * Workflow with an empty step type field.
 * Used for autocompletion suggestion tests.
 */
export const getIncompleteStepTypeYaml = (name: string) => `
name: ${name}
description: Test workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: hello_world_step
    type:`;

/**
 * Manual-only workflow with an event variable reference.
 * Used to verify that event.* autocomplete only shows spaceId (no alert properties).
 */
export const getManualTriggerEventAutocompleteYaml = (name: string) => `
name: ${name}
description: Manual trigger - event should only have spaceId
enabled: true
triggers:
  - type: manual
steps:
  - name: log_step
    type: console
    with:
      message: "{{ event. }}"`;

/**
 * Alert trigger workflow with an event variable reference.
 * Used to verify that event.* autocomplete shows alerts, rule, params, and spaceId.
 */
export const getAlertTriggerEventAutocompleteYaml = (name: string) => `
name: ${name}
description: Alert trigger - event should have alerts, rule, params, spaceId
enabled: true
triggers:
  - type: alert
steps:
  - name: log_step
    type: console
    with:
      message: "{{ event. }}"`;
