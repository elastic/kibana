/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  workflowTools,
} from '../../../common/agent_builder/constants';

export const workflowAuthoringSkill = defineSkillType({
  id: 'workflow-authoring',
  name: 'workflow-authoring',
  experimental: true,
  basePath: 'skills/platform/workflows',
  description:
    'Create, modify, and validate Elastic workflow YAML definitions using natural language. Covers step types, triggers, Liquid templating, connector integrations, and validation.',
  content: `## Auto-Loading Note

When a ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment is present, all workflow tools are already available and
validation results are shown in the attachment. You do NOT need to load this skill to access tools
or see validation errors — skip the \`filestore.read\` call.

## When to Use This Skill

Use this skill when the user wants to:
- Create a new workflow YAML definition (no ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment present)
- Understand advanced step types, triggers, or connector integrations
- Learn workflow YAML syntax, Liquid templating, or best practices
- Fix complex validation errors that require understanding step schemas

## Available Tools

### Lookup Tools
- **${workflowTools.getStepDefinitions}**: Look up available step types, their input params (\`with\` block), config params, and examples
- **${workflowTools.getTriggerDefinitions}**: Look up available trigger types and their schemas
- **${workflowTools.getExamples}**: Search the bundled example library for working workflow YAML patterns
- **${workflowTools.getConnectors}**: Find connector instances configured in the user's environment
- **${workflowTools.validateWorkflow}**: Validate a complete workflow YAML string against all rules. When validation fails, step definitions for referenced step types are automatically included.

### Discovering Existing Workflows (SML)

To list or find existing workflows, use the SML (Semantic Metadata Layer) tools — do NOT use \`${platformCoreTools.search}\` to query internal indices.

1. **${platformCoreTools.smlSearch}**: Search for workflows by name, description, or tags. Pass a query like "workflow" or use "*" to return all available workflows. Results include \`chunk_id\` values.
2. **${platformCoreTools.smlAttach}**: Attach a workflow to the conversation by passing \`chunk_ids\` from the search results. This loads the full workflow YAML as a ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment that you can then edit with the edit tools below.

### Edit Tools
- **${workflowTools.setYaml}**: Set the complete workflow YAML. Creates a new workflow when no ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment exists, or replaces the entire YAML of an existing one.
- **${workflowTools.insertStep}**: Insert a new step at the end of the steps list (requires existing attachment)
- **${workflowTools.modifyStep}**: Replace an entire step by name (requires existing attachment)
- **${workflowTools.modifyStepProperty}**: Modify a single property of a step (requires existing attachment)
- **${workflowTools.modifyProperty}**: Modify a top-level workflow property (requires existing attachment)
- **${workflowTools.deleteStep}**: Delete a step by name (requires existing attachment)

## Core Instructions

### Creating New Workflows

To create a new workflow, call \`${workflowTools.setYaml}\` with the complete YAML. This tool creates the ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment automatically when none exists. Do NOT use attachments.add or attachment_add — that will fail.

### Search Examples Before Writing Step YAML

Before writing new steps or modifying step types you haven't seen in this conversation,
use \`${workflowTools.getExamples}\` to find similar working patterns. This applies to both new workflows
and adding/changing steps in existing ones.

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
  # or:
  # - type: scheduled
  #   with:
  #     every: "5m"
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
      max-attempts: 3
      delay: "5s"
    fallback:                  # fallback steps on failure
      - name: handle_error
        type: console
        with:
          message: "Step failed"
    continue: true             # optionally continue execution after failure
\`\`\`

- **\`with\`**: Contains the step's input parameters (listed as \`inputParams\` in tool results)
- **Config params**: Step-level fields outside \`with\` (listed as \`configParams\` in tool results, e.g. \`condition\`/\`steps\`/\`else\` for \`if\`, \`foreach\`/\`steps\` for \`foreach\`)
- **\`connector-id\`**: Required or optional depending on step type (shown in tool results)

### Step Types

#### Built-in Step Types
- **http**: Make HTTP requests to external APIs
- **foreach**: Loop over collections with nested steps
- **if**: Conditional execution with \`condition\` and optional \`else\` block
- **data.set**: Set variables in workflow context
- **data.transform**: Transform data using expressions
- **wait**: Pause execution for a duration
- **console**: Log messages to execution output
- **elasticsearch.search**: Query Elasticsearch indices
- **elasticsearch.bulk**: Bulk index documents
- **ai.agent**: Invoke an AI agent

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
Use \`${workflowTools.getConnectors}\` to find the connector IDs configured in the user's environment.

### Verify Step Type IDs Before Editing

**ALWAYS call \`${workflowTools.getStepDefinitions}\` to verify the exact step type ID before inserting a new step or changing a step's type.**
Step types have specific IDs (e.g. \`kibana.createCase\`, not \`kibana\`; \`http\`, not \`http.request\`).
Using an incorrect type ID will produce a validation error — verify the ID first to avoid invalid proposals.

### Liquid Templating

Use Liquid syntax for dynamic values:
- \`{{ steps.step_name.output.field }}\` - Reference step outputs (ONLY \`output\` is accessible — NEVER \`steps.<name>.with.*\` or \`steps.<name>.<input_param>\`). Use \`${workflowTools.getStepDefinitions}\` with \`includeOutputSummary\` to learn what a step's output contains.
- \`{{ inputs.input_name }}\` - Reference workflow inputs
- \`{{ consts.constant_name }}\` - Reference constants
- \`{{ foreach.item }}\` - Current item in a foreach loop
- \`{{ event }}\` - Trigger event data (available for all trigger types)

**IMPORTANT — event variable path:** The trigger event is accessed via \`{{ event }}\` directly — NEVER \`{{ triggers.event }}\`, \`{{ trigger.event }}\`, or \`{{ triggers.event.* }}\`. The \`triggers\` block only configures which triggers activate the workflow; it does NOT contain runtime event data.

**Alert trigger event structure** (available when \`triggers\` includes \`type: alert\`):
- \`{{ event.alerts }}\` - Array of alert objects that fired
- \`{{ event.alerts[0]._id }}\` - Alert ID
- \`{{ event.alerts[0]._index }}\` - Alert index
- \`{{ event.alerts[0].kibana.alert }}\` - Alert details
- \`{{ event.alerts[0]["@timestamp"] }}\` - Alert timestamp
- \`{{ event.rule.id }}\` - Rule ID
- \`{{ event.rule.name }}\` - Rule name
- \`{{ event.rule.tags }}\` - Rule tags
- \`{{ event.spaceId }}\` - Space where the event was emitted

Use \`${workflowTools.getTriggerDefinitions}\` to get the full event context schema for any trigger type.

Useful filters:
- \`| json\` - Convert to JSON string
- \`| url_encode\` - URL encode a string
- \`| default: "value"\` - Provide default if nil

### Self-Validation Before Proposing Changes

When you generate or modify workflow YAML, you SHOULD validate it before proposing the change:

1. Generate the YAML you intend to propose
2. Call \`${workflowTools.validateWorkflow}\` with the complete workflow YAML
3. If validation returns errors: fix the issues and re-validate until valid
4. If validation passes: present the result to the user

Skip validation for trivial changes where the risk of errors is low.

### Fixing Validation Errors

When fixing validation errors:

1. Call \`${workflowTools.validateWorkflow}\` — it automatically includes step definitions for all referenced step types when validation fails
2. Analyze the errors and identify the problematic steps
3. If a step type does NOT exist: tell the user and list similar alternatives from the included step definitions
4. Use edit tools to fix the issues, then check the \`validation\` field in the edit tool response to confirm the fix
5. NEVER guess or replace a step type with something unrelated
6. **After fixing an error, scan the entire YAML for other occurrences of the same mistake.** For example, if you fix \`triggers.event\` → \`event\` in one place, check all other Liquid expressions for the same incorrect pattern and fix them all in one pass

### Proposing Changes (Edit Tools)

When a ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment is present in the conversation, you MUST use the edit tools to propose changes.
Edit tools compute the diff on the server, emit a ${WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE} attachment visible in chat, and update
the YAML attachment so subsequent edits see the latest state. The client-side editor will show the diff
with an accept/decline UX. NEVER just describe changes in text when edit tools are available.

When using edit tools:
1. Provide step definitions as structured JSON objects, NOT as YAML strings
2. Include a \`description\` explaining what the change does
3. Validate the workflow AFTER the user accepts the proposed change
5. For multi-step changes, call multiple edit tools — each creates a separate proposal
6. Each edit tool reads the current YAML from the ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment and updates it,
   so sequential tool calls within a round see each other's changes
7. After edits, you can render the ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment with <render_attachment id="{attachmentId}"/> to show the user the current complete YAML

### Best Practices

1. Always search examples first before writing step YAML
2. Use unique step names within the workflow
3. Use 2 spaces per indentation level
4. Use \`on-failure\` with \`retry\`, \`fallback\`, and (optionally) \`continue\` for error handling
5. Prefer connector steps over raw HTTP for integrations`,
  getRegistryTools: () => Object.values(workflowTools),
});
