/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { GET_CONNECTORS_TOOL_ID } from '../tools/get_connectors_tool';
import { GET_EXAMPLES_TOOL_ID } from '../tools/get_examples_tool';
import { GET_STEP_DEFINITIONS_TOOL_ID } from '../tools/get_step_definitions_tool';
import { GET_TRIGGER_DEFINITIONS_TOOL_ID } from '../tools/get_trigger_definitions_tool';
import { GET_WORKFLOW_TOOL_ID } from '../tools/get_workflow_tool';
import { LIST_WORKFLOWS_TOOL_ID } from '../tools/list_workflows_tool';
import { VALIDATE_WORKFLOW_TOOL_ID } from '../tools/validate_workflow_tool';

export const workflowAuthoringSkill = defineSkillType({
  id: 'workflow-authoring',
  name: 'workflow-authoring',
  basePath: 'skills/platform/workflows',
  description:
    'Create, modify, and validate Elastic workflow YAML definitions using natural language. Covers step types, triggers, Liquid templating, connector integrations, and validation.',
  content: `## When to Use This Skill

Use this skill when the user wants to:
- Create a new workflow YAML definition
- Modify or extend an existing workflow
- Understand available step types, triggers, or connector integrations
- Fix workflow validation errors
- Learn workflow YAML syntax, Liquid templating, or best practices

## Available Tools

- **get_step_definitions**: Look up available step types, their input params (\`with\` block), config params, and examples
- **get_trigger_definitions**: Look up available trigger types and their schemas
- **get_examples**: Search the bundled example library for working workflow YAML patterns
- **get_connectors**: Find connector instances configured in the user's environment
- **validate_workflow**: Validate a complete workflow YAML string against all rules
- **list_workflows**: List workflows in the user's environment
- **get_workflow**: Retrieve a specific workflow by ID

## Core Instructions

### CRITICAL: Always Search Examples First

Before generating any workflow YAML, ALWAYS use \`get_examples\` to find similar examples.
This ensures you use the correct syntax and available step types. The example library contains
real, working workflows that demonstrate the proper way to use each step type.

### Workflow YAML Structure

A workflow YAML file has this structure:
\`\`\`yaml
version: '1'
name: Workflow Name
description: Description of what the workflow does
enabled: true
tags: ["tag1", "tag2"]

consts:
  my_constant: "value"

inputs:
  properties:
    input_name:
      type: string
      description: Input description
      default: "default value"

triggers:
  - type: manual
  # or: type: scheduled, every: "5m"
  # or: type: alert

steps:
  - name: step_name
    type: step_type
    with:
      param1: value1
      param2: "{{ liquid_expression }}"
\`\`\`

### Common Step Properties

Every step (regardless of type) supports these properties. They are NOT repeated per step in tool results.

\`\`\`yaml
- name: unique_step_name       # required, unique within the workflow
  type: step_type              # required, the step type ID
  with:                        # input parameters (specific to step type)
    param1: value1
  connector-id: my-connector   # only for connector-based steps that require it
  if: "steps.prev.output.ok"   # optional, skip step when condition is falsy
  timeout: "30s"               # optional, step-level timeout
  on-failure:                  # optional, error handling
    retry:
      max_retries: 3
      delay: "5s"
    steps:                     # fallback steps on failure
      - name: handle_error
        type: console
        with:
          message: "Step failed"
\`\`\`

- **\`with\`**: Contains the step's input parameters (listed as \`inputParams\` in tool results)
- **Config params**: Step-level fields outside \`with\` (listed as \`configParams\` in tool results, e.g. \`condition\`/\`steps\`/\`else\` for \`if\`, \`foreach\`/\`steps\` for \`foreach\`)
- **\`connector-id\`**: Required or optional depending on step type (shown in tool results)

### Step Types

#### Built-in Step Types
- **http**: Make HTTP requests to external APIs
- **foreach**: Loop over collections with nested steps
- **if**: Conditional execution with \`condition\` and optional \`else\` block
- **parallel**: Execute multiple branches concurrently
- **data.set**: Set variables in workflow context
- **data.transform**: Transform data using expressions
- **wait**: Pause execution for a duration
- **console**: Log messages to execution output
- **elasticsearch.search**: Query Elasticsearch indices
- **elasticsearch.bulk**: Bulk index documents
- **kibana.post_agent_builder_converse**: Invoke an AI agent

#### Connector-Based Step Types (PREFERRED for integrations!)

Workflows can use Kibana connectors for integrations. These use the connector name as the step type
and require a \`connector-id\` to specify which configured connector to use.

**ALWAYS prefer connector steps over raw HTTP for integrations like Slack, Jira, etc.**
Connector steps are simpler, more secure, and handle authentication automatically.

Available connector types include: slack, jira, pagerduty, email, webhook, servicenow, opsgenie, teams, and more.

**Slack connector example (PREFERRED):**
\`\`\`yaml
- name: send_slack_notification
  type: slack
  connector-id: my-slack-connector
  with:
    message: "Hello from the workflow!"
\`\`\`

When asked to add Slack/Jira/etc integration, ALWAYS use connector steps first!
Use \`get_connectors\` to find the connector IDs configured in the user's environment.

### Liquid Templating

Use Liquid syntax for dynamic values:
- \`{{ steps.step_name.output.field }}\` - Reference step outputs
- \`{{ inputs.input_name }}\` - Reference workflow inputs
- \`{{ consts.constant_name }}\` - Reference constants
- \`{{ foreach.item }}\` - Current item in a foreach loop
- \`{{ event }}\` - Trigger event data (for alert triggers)

Useful filters:
- \`| json\` - Convert to JSON string
- \`| url_encode\` - URL encode a string
- \`| default: "value"\` - Provide default if nil

### Self-Validation Before Proposing Changes

When you generate or modify workflow YAML, you SHOULD validate it before proposing the change:

1. Generate the YAML you intend to propose
2. Call \`validate_workflow\` with the complete workflow YAML
3. If validation returns errors: fix the issues and re-validate until valid
4. If validation passes: present the result to the user

Skip validation for trivial changes where the risk of errors is low.

### Fixing Validation Errors

When the user asks you to fix a validation error:

1. **ALWAYS call \`get_step_definitions\` FIRST** to get the list of all valid step types
2. Analyze the error and identify the problematic step
3. Compare the step type with valid step types from get_step_definitions
4. If the step type exists: check the step definition for correct usage
5. If the step type does NOT exist: tell the user and list similar alternatives
6. NEVER guess or replace a step type with something unrelated

### Best Practices

1. Always search examples first before writing step YAML
2. Use unique step names within the workflow
3. Use 2 spaces per indentation level
4. Use \`on-failure\` with \`retry\` and \`continue\` options for error handling
5. Prefer connector steps over raw HTTP for integrations`,
  getRegistryTools: () => [
    GET_STEP_DEFINITIONS_TOOL_ID,
    GET_TRIGGER_DEFINITIONS_TOOL_ID,
    GET_EXAMPLES_TOOL_ID,
    GET_CONNECTORS_TOOL_ID,
    VALIDATE_WORKFLOW_TOOL_ID,
    LIST_WORKFLOWS_TOOL_ID,
    GET_WORKFLOW_TOOL_ID,
  ],
});
