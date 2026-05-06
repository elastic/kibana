# agentBuilderWorkflows Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move workflow Agent Builder primitives (tools, attachments, skills, SML type, telemetry, renderers) out of `agent_builder_platform` and `workflows_management` into the new `agent_builder_workflows` plugin, in one PR.

**Architecture:** Mechanical relocation. Phase 1 — populate the new plugin's source tree by copying files and rewriting imports. Phase 2 — wire the new plugin's `setup`/`start` to register everything. Phase 3 — delete the old code from both source plugins, including the constants split. The final state has each primitive registered exactly once, by the new plugin.

**Tech Stack:** TypeScript, Kibana plugin platform, Jest. No new dependencies introduced.

**Important runtime caveat for in-progress states:** Between Task 10 (new plugin starts registering tools) and Task 13/14 (old registrations removed), several primitives would be registered twice at runtime, which is fatal (`analytics.registerEventType` and tool/SML registries throw on duplicates). **Do not run the application or full integration tests between Task 10 and Task 14.** Type-checking and Jest unit tests for individual files are safe throughout. The runtime safety guarantee is restored after Task 16.

**Spec:** `docs/superpowers/specs/2026-05-06-agent-builder-workflows-migration-design.md`

---

## File Structure

After all tasks complete:

```
x-pack/platform/plugins/shared/agent_builder_workflows/
  kibana.jsonc                  [modified, Task 1]
  tsconfig.json                 [modified, growing through Tasks 2–11]
  common/
    constants.ts                [created Task 2]
    index.ts                    [created Task 2]
  public/
    index.ts                    [unchanged scaffold]
    plugin.tsx                  [modified Task 12]
    types.ts                    [modified Task 1]
    attachment_types/
      index.ts                  [created Task 11]
      workflow_yaml_attachment_renderer.tsx           [created Task 11]
      workflow_yaml_attachment_renderer.test.tsx      [created Task 11]
      workflow_yaml_diff_attachment_renderer.tsx      [created Task 11]
      workflow_yaml_diff_attachment_renderer.stories.tsx  [created Task 11]
  server/
    index.ts                    [unchanged scaffold]
    plugin.ts                   [modified Task 10]
    types.ts                    [modified Task 1]
    config.ts                   [unchanged]
    register_workflow_agent_builder_integration.ts    [created Task 8]
    attachment_types/
      workflow_yaml_attachment.ts                     [created Task 6]
      workflow_yaml_attachment.test.ts                [created Task 6]
      workflow_yaml_diff_attachment.ts                [created Task 6]
      workflow_yaml_diff_attachment.test.ts           [created Task 6]
    skills/
      workflow_authoring_skill.ts                     [created Task 5]
      workflow_authoring_skill.test.ts                [created Task 5]
    sml_types/
      workflow.ts                                     [created Task 4]
      workflow.test.ts                                [created Task 4]
    telemetry/
      workflows_ai_telemetry_client.ts                [created Task 3]
      workflows_ai_telemetry_client.test.ts           [created Task 3]
      events/
        workflows_ai_edit_result.ts                   [created Task 3]
    tools/
      get_workflow_execution_status.ts                [created Task 9]
      resume_workflow_execution.ts                    [created Task 9]
      resume_workflow_execution.test.ts               [created Task 9]
      validate_workflow_tool.ts                       [created Task 7]
      validate_workflow_tool.test.ts                  [created Task 7]
      get_step_definitions_tool.ts                    [created Task 7]
      get_step_definitions_tool.test.ts               [created Task 7]
      get_step_definitions_tool.dynamic_connectors.test.ts  [created Task 7]
      get_step_definitions_tool_output_size.test.ts   [created Task 7]
      get_trigger_definitions_tool.ts                 [created Task 7]
      get_trigger_definitions_tool.test.ts            [created Task 7]
      get_connectors_tool.ts                          [created Task 7]
      get_connectors_tool.test.ts                     [created Task 7]
      get_examples_tool.ts                            [created Task 7]
      get_examples_tool.test.ts                       [created Task 7]
      workflow_execute_step_tool.ts                   [created Task 7]
      workflow_execute_step_tool.test.ts              [created Task 7]
      workflow_edit_tools.ts                          [created Task 7]
      yaml_edit_utils.ts                              [created Task 7]
      yaml_edit_utils.test.ts                         [created Task 7]
```

Files removed in Tasks 13–16:

```
x-pack/platform/plugins/shared/agent_builder_platform/
  server/tools/get_workflow_execution_status.ts                [deleted Task 13]
  server/tools/resume_workflow_execution.ts                    [deleted Task 13]
  server/tools/resume_workflow_execution.test.ts               [deleted Task 13]
  server/tools/index.ts                                        [edited Task 13]
  server/types.ts                                              [edited Task 13]
  kibana.jsonc                                                 [edited Task 13]

src/platform/plugins/shared/workflows_management/
  server/agent_builder/                                        [deleted entirely Task 14]
  server/telemetry/workflows_ai_telemetry_client.ts            [deleted Task 14]
  server/telemetry/workflows_ai_telemetry_client.test.ts       [deleted Task 14]
  server/telemetry/events/workflows_ai_edit_result.ts          [deleted Task 14]
  server/plugin.ts                                             [edited Task 14]
  kibana.jsonc                                                 [edited Task 14]
  public/features/ai_integration/attachment_renderers/         [deleted Task 15]
  public/features/ai_integration/index.ts                      [edited Task 15]
  public/plugin.ts                                             [edited Task 15]
  common/agent_builder/constants.ts                            [edited Task 16]
```

---

## Task 1: Configure new plugin manifest, types, tsconfig

**Files:**
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/kibana.jsonc`
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/server/types.ts`
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/public/types.ts`
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`

- [ ] **Step 1.1: Update `kibana.jsonc` to declare required plugin dependencies**

Replace the file with:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/agent-builder-workflows-plugin",
  "owner": ["@elastic/workchat-eng", "@elastic/workflows-eng"],
  "group": "platform",
  "visibility": "shared",
  "plugin": {
    "id": "agentBuilderWorkflows",
    "server": true,
    "browser": true,
    "configPath": ["xpack", "agentBuilderWorkflows"],
    "requiredPlugins": ["agentBuilder", "workflowsManagement", "agentContextLayer"],
    "requiredBundles": [],
    "optionalPlugins": [],
    "extraPublicDirs": []
  }
}
```

- [ ] **Step 1.2: Replace `server/types.ts` to declare typed dependencies**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-server';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
} from '@kbn/agent-context-layer-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer: AgentContextLayerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentContextLayer: AgentContextLayerPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
```

- [ ] **Step 1.3: Replace `public/types.ts` to declare typed dependencies**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-browser';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderWorkflowsPluginStart {}
```

- [ ] **Step 1.4: Update `tsconfig.json` to add required `kbn_references` and include `common`**

```json
{
  "extends": "@kbn/tsconfig-base/tsconfig.json",
  "compilerOptions": {
    "outDir": "target/types"
  },
  "include": ["../../../../../typings/**/*", "common/**/*", "public/**/*", "server/**/*"],
  "exclude": ["target/**/*", ".storybook/**/*.js"],
  "kbn_references": [
    "@kbn/core",
    "@kbn/logging",
    "@kbn/config-schema",
    "@kbn/agent-builder-server",
    "@kbn/agent-builder-browser",
    "@kbn/agent-builder-common",
    "@kbn/agent-context-layer-plugin",
    "@kbn/workflows-management-plugin"
  ]
}
```

Additional `kbn_references` will be added in later tasks as new dependencies are introduced. The list expected by the end of the migration:

```
"@kbn/agent-builder-genai-utils",
"@kbn/agent-builder-tools-base",
"@kbn/management-settings-ids",
"@kbn/i18n",
"@kbn/zod",
"@kbn/workflows",
"@kbn/workflows-yaml",
"@kbn/workflows-ui",
"@kbn/storage-adapter",
"@kbn/code-editor",
"@kbn/kibana-react-plugin",
"@kbn/core-analytics-server",
"@kbn/core-analytics-browser"
```

If a later task fails type-check with "Cannot find module '@kbn/...'" for one of these, add it to `kbn_references` and re-run.

- [ ] **Step 1.5: Type-check the new plugin**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean.

- [ ] **Step 1.6: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows
git commit -m "chore(agent-builder-workflows): declare manifest deps and typed contracts"
```

---

## Task 2: Create `common/constants.ts` in new plugin

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/common/constants.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/common/index.ts`

- [ ] **Step 2.1: Create `common/constants.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
export const WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE = 'workflow.yaml.diff';
export const WORKFLOW_SML_TYPE = 'workflow';

const workflowTool = <TName extends string>(
  toolName: TName
): `${typeof internalNamespaces.workflows}.${TName}` => {
  return `${internalNamespaces.workflows}.${toolName}`;
};

export const workflowTools = {
  insertStep: workflowTool('workflow_insert_step'),
  modifyStep: workflowTool('workflow_modify_step'),
  modifyStepProperty: workflowTool('workflow_modify_step_property'),
  modifyProperty: workflowTool('workflow_modify_property'),
  deleteStep: workflowTool('workflow_delete_step'),
  setYaml: workflowTool('workflow_set_yaml'),
  getStepDefinitions: workflowTool('get_step_definitions'),
  getTriggerDefinitions: workflowTool('get_trigger_definitions'),
  validateWorkflow: workflowTool('validate_workflow'),
  getExamples: workflowTool('get_examples'),
  getConnectors: workflowTool('get_connectors'),
  executeStep: workflowTool('workflow_execute_step'),
} as const;
```

- [ ] **Step 2.2: Create `common/index.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  WORKFLOW_SML_TYPE,
  workflowTools,
} from './constants';
```

- [ ] **Step 2.3: Type-check the new plugin**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean.

- [ ] **Step 2.4: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/common
git commit -m "feat(agent-builder-workflows): add common constants module"
```

Note: `WORKFLOW_YAML_CHANGED_EVENT` deliberately stays in `workflows_management/common/agent_builder/constants.ts` and will be imported by the moved `workflow_edit_tools.ts` in Task 7 via `@kbn/workflows-management-plugin/common/agent_builder/constants`.

---

## Task 3: Move telemetry to new plugin

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/workflows_ai_telemetry_client.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/workflows_ai_telemetry_client.test.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/events/workflows_ai_edit_result.ts`

- [ ] **Step 3.1: Copy event schema**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/events
cp src/platform/plugins/shared/workflows_management/server/telemetry/events/workflows_ai_edit_result.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/events/workflows_ai_edit_result.ts
```

No internal imports to rewrite — the file imports only from `@kbn/core/server`.

- [ ] **Step 3.2: Copy telemetry client and test**

```bash
cp src/platform/plugins/shared/workflows_management/server/telemetry/workflows_ai_telemetry_client.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/workflows_ai_telemetry_client.ts
cp src/platform/plugins/shared/workflows_management/server/telemetry/workflows_ai_telemetry_client.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/workflows_ai_telemetry_client.test.ts
```

The relative import `./events/workflows_ai_edit_result` resolves correctly in the new location — no edits required.

- [ ] **Step 3.3: Run the telemetry test from the new location**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry/workflows_ai_telemetry_client.test.ts`
Expected: PASS.

- [ ] **Step 3.4: Type-check the new plugin**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean.

- [ ] **Step 3.5: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/telemetry
git commit -m "feat(agent-builder-workflows): copy WorkflowsAiTelemetryClient and event schema"
```

---

## Task 4: Move SML type to new plugin

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types/workflow.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types/workflow.test.ts`

- [ ] **Step 4.1: Copy and rewrite imports**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types
cp src/platform/plugins/shared/workflows_management/server/agent_builder/sml_types/workflow.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types/workflow.ts
cp src/platform/plugins/shared/workflows_management/server/agent_builder/sml_types/workflow.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types/workflow.test.ts
```

In the new copy of `workflow.ts`, replace the import block (lines 12–17 in the source) with:

```ts
import {
  WORKFLOW_SML_TYPE,
  WORKFLOW_YAML_ATTACHMENT_TYPE,
} from '../../common/constants';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  workflowIndexName,
  type WorkflowProperties,
} from '@kbn/workflows-management-plugin/server/storage/workflow_storage';
```

Note: `WorkflowsManagementApi` may need to be exported from `@kbn/workflows-management-plugin/server` if it isn't already a public export. Check `src/platform/plugins/shared/workflows_management/server/index.ts` and `server/types.ts`. The `WorkflowsServerPluginSetup` interface already has `management: WorkflowsManagementApi`, so the type is reachable via `WorkflowsServerPluginSetup['management']` if a direct export doesn't exist.

If `WorkflowsManagementApi` is not exported, replace the import with:

```ts
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];
```

In the test file, update equivalent imports the same way.

- [ ] **Step 4.2: Run the SML type test**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types/workflow.test.ts`
Expected: PASS.

- [ ] **Step 4.3: Type-check the new plugin**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean. If it fails on the `workflow_storage` deep import, confirm the path resolves (check `src/platform/plugins/shared/workflows_management/server/storage/workflow_storage.ts` exists and the file's `@kbn/workflows-management-plugin/server/*` path mapping works).

- [ ] **Step 4.4: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/sml_types
git commit -m "feat(agent-builder-workflows): copy workflow SML type"
```

---

## Task 5: Move skills to new plugin

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/skills/workflow_authoring_skill.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/skills/workflow_authoring_skill.test.ts`

- [ ] **Step 5.1: Copy and rewrite imports**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/server/skills
cp src/platform/plugins/shared/workflows_management/server/agent_builder/skills/workflow_authoring_skill.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/skills/workflow_authoring_skill.ts
cp src/platform/plugins/shared/workflows_management/server/agent_builder/skills/workflow_authoring_skill.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/skills/workflow_authoring_skill.test.ts
```

In the new copy of `workflow_authoring_skill.ts`, replace:

```ts
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  workflowTools,
} from '../../../common/agent_builder/constants';
```

with:

```ts
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  workflowTools,
} from '../../common/constants';
```

In the test file, update the same import.

- [ ] **Step 5.2: Run the skill test**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/skills/workflow_authoring_skill.test.ts`
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/skills
git commit -m "feat(agent-builder-workflows): copy workflow authoring skill"
```

---

## Task 6: Move attachment types (server) to new plugin

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_attachment.ts` (+ .test.ts)
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_diff_attachment.ts` (+ .test.ts)

- [ ] **Step 6.1: Copy attachment files**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types
cp src/platform/plugins/shared/workflows_management/server/agent_builder/attachments/workflow_yaml_attachment.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_attachment.ts
cp src/platform/plugins/shared/workflows_management/server/agent_builder/attachments/workflow_yaml_attachment.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_attachment.test.ts
cp src/platform/plugins/shared/workflows_management/server/agent_builder/attachments/workflow_yaml_diff_attachment.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_diff_attachment.ts
cp src/platform/plugins/shared/workflows_management/server/agent_builder/attachments/workflow_yaml_diff_attachment.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types/workflow_yaml_diff_attachment.test.ts
```

- [ ] **Step 6.2: Rewrite imports in each file**

In each of the 4 copied files, apply these substitutions (only those that match the file's actual imports):

| Old | New |
|-----|-----|
| `'../../../common/agent_builder/constants'` | `'../../common/constants'` |
| `'../../api/workflows_management_api'` (type-only) | `'@kbn/workflows-management-plugin/server'` (with `WorkflowsManagementApi` re-derivation if needed; see Task 4 fallback) |
| `'../../types'` (for `AgentBuilderPluginSetup`) | `'@kbn/agent-builder-server'` |

Read each file before editing — apply only substitutions that match.

- [ ] **Step 6.3: Run the attachment tests**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types`
Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/attachment_types
git commit -m "feat(agent-builder-workflows): copy workflow YAML attachment types"
```

---

## Task 7: Move workflows tools to new plugin

This task copies all 11 source files (plus tests) from `workflows_management/server/agent_builder/tools/` into the new plugin's `server/tools/`.

**Files copied:**
- `validate_workflow_tool.ts` (+ test)
- `get_step_definitions_tool.ts` (+ 3 tests: regular, dynamic_connectors, output_size)
- `get_trigger_definitions_tool.ts` (+ test)
- `get_connectors_tool.ts` (+ test)
- `get_examples_tool.ts` (+ test)
- `workflow_execute_step_tool.ts` (+ test)
- `workflow_edit_tools.ts` (no test)
- `yaml_edit_utils.ts` (+ test)

- [ ] **Step 7.1: Copy all tools files**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/server/tools
cp src/platform/plugins/shared/workflows_management/server/agent_builder/tools/*.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/
```

- [ ] **Step 7.2: Rewrite imports in every copied file**

For each `.ts` and `.test.ts` file just copied, apply these substitutions where they match the file's existing imports:

| Old | New |
|-----|-----|
| `from '../../../common/agent_builder/constants'` (importing `WORKFLOW_YAML_CHANGED_EVENT` only) | `from '@kbn/workflows-management-plugin/common/agent_builder/constants'` |
| `from '../../../common/agent_builder/constants'` (importing other constants) | `from '../../common/constants'` |
| `from '../../api/workflows_management_api'` (type-only) | See Task 4 fallback (re-derive from `WorkflowsServerPluginSetup['management']` if not directly exported) |
| `from '../../telemetry/workflows_ai_telemetry_client'` | `from '../telemetry/workflows_ai_telemetry_client'` |
| `from '../../types'` (re-exporting `AgentBuilderPluginSetup`) | `from '@kbn/agent-builder-server'` |

`workflow_edit_tools.ts` is the most complex: it imports from all five categories above. After substitution, its top-of-file imports should be:

```ts
import { v4 } from 'uuid';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import type { EditResult, StepDefinition } from './yaml_edit_utils';
import {
  deleteStep,
  insertStep,
  modifyStep,
  modifyStepProperty,
  modifyWorkflowProperty,
} from './yaml_edit_utils';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  workflowTools,
} from '../../common/constants';
import { WORKFLOW_YAML_CHANGED_EVENT } from '@kbn/workflows-management-plugin/common/agent_builder/constants';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsAiTelemetryClient } from '../telemetry/workflows_ai_telemetry_client';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];
```

- [ ] **Step 7.3: Add any missing `kbn_references`**

Type-check the new plugin: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`. For each "Cannot find module '@kbn/...'" error, add the package to `kbn_references` in `tsconfig.json`. Re-run until clean.

- [ ] **Step 7.4: Run all tools tests from the new location**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/tools`
Expected: All PASS.

If any test mock paths broke (e.g. `jest.mock('../../api/workflows_management_api')`), update the mock path to the new import path used in step 7.2.

- [ ] **Step 7.5: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/tools \
        x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json
git commit -m "feat(agent-builder-workflows): copy workflow tools"
```

---

## Task 8: Move integration registration helper

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/register_workflow_agent_builder_integration.ts`

- [ ] **Step 8.1: Create the file with rewritten imports**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { registerWorkflowYamlAttachment } from './attachment_types/workflow_yaml_attachment';
import { registerWorkflowYamlDiffAttachment } from './attachment_types/workflow_yaml_diff_attachment';
import { workflowAuthoringSkill } from './skills/workflow_authoring_skill';
import { registerGetConnectorsTool } from './tools/get_connectors_tool';
import { registerGetExamplesTool } from './tools/get_examples_tool';
import { registerGetStepDefinitionsTool } from './tools/get_step_definitions_tool';
import { registerGetTriggerDefinitionsTool } from './tools/get_trigger_definitions_tool';
import { registerValidateWorkflowTool } from './tools/validate_workflow_tool';
import { registerWorkflowEditTools } from './tools/workflow_edit_tools';
import { registerWorkflowExecuteStepTool } from './tools/workflow_execute_step_tool';
import type { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

interface RegisterWorkflowAgentBuilderIntegrationParams {
  agentBuilder: AgentBuilderPluginSetup;
  logger: Logger;
  api: WorkflowsManagementApi;
  aiTelemetryClient: WorkflowsAiTelemetryClient;
}

export function registerWorkflowAgentBuilderIntegration({
  agentBuilder,
  logger,
  api,
  aiTelemetryClient,
}: RegisterWorkflowAgentBuilderIntegrationParams): void {
  logger.debug('Registering workflow Agent Builder integration components');

  registerValidateWorkflowTool(agentBuilder, api);
  registerGetStepDefinitionsTool(agentBuilder, api);
  registerGetTriggerDefinitionsTool(agentBuilder);
  registerGetConnectorsTool(agentBuilder, api);
  registerGetExamplesTool(agentBuilder);

  registerWorkflowExecuteStepTool(agentBuilder, api);
  registerWorkflowEditTools(agentBuilder, api, aiTelemetryClient);

  registerWorkflowYamlAttachment(agentBuilder, api);
  registerWorkflowYamlDiffAttachment(agentBuilder);

  agentBuilder.skills.register(workflowAuthoringSkill);

  logger.debug('Workflow Agent Builder integration components registered');
}
```

- [ ] **Step 8.2: Type-check**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean.

- [ ] **Step 8.3: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/register_workflow_agent_builder_integration.ts
git commit -m "feat(agent-builder-workflows): add registration helper"
```

---

## Task 9: Move platform tools (`get_workflow_execution_status`, `resume_workflow_execution`)

These move from `agent_builder_platform/server/tools/` to the new plugin.

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/get_workflow_execution_status.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.test.ts`

- [ ] **Step 9.1: Copy files**

```bash
cp x-pack/platform/plugins/shared/agent_builder_platform/server/tools/get_workflow_execution_status.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/get_workflow_execution_status.ts
cp x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.ts
cp x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.test.ts \
   x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.test.ts
```

These three files use only `@kbn/...` imports (no relative paths into `agent_builder_platform`), so no import rewrites are needed.

- [ ] **Step 9.2: Run the test**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.test.ts`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/get_workflow_execution_status.ts \
        x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.ts \
        x-pack/platform/plugins/shared/agent_builder_workflows/server/tools/resume_workflow_execution.test.ts
git commit -m "feat(agent-builder-workflows): copy platform workflow execution tools"
```

---

## Task 10: Wire server `plugin.ts`

**Files:**
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/server/plugin.ts`

- [ ] **Step 10.1: Replace `server/plugin.ts` with the wired implementation**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { PluginConfig } from './config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderWorkflowsPluginSetup,
  AgentBuilderWorkflowsPluginStart,
} from './types';
import { WorkflowsAiTelemetryClient } from './telemetry/workflows_ai_telemetry_client';
import { registerWorkflowAgentBuilderIntegration } from './register_workflow_agent_builder_integration';
import { createWorkflowSmlType } from './sml_types/workflow';
import { getWorkflowExecutionStatusTool } from './tools/get_workflow_execution_status';
import { resumeWorkflowExecutionTool } from './tools/resume_workflow_execution';

type WorkflowsManagementApi = WorkflowsServerPluginSetup['management'];

export class AgentBuilderWorkflowsPlugin
  implements
    Plugin<
      AgentBuilderWorkflowsPluginSetup,
      AgentBuilderWorkflowsPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private readonly logger: Logger;
  private api: WorkflowsManagementApi | null = null;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderWorkflowsPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderWorkflowsPluginSetup {
    const { agentBuilder, agentContextLayer, workflowsManagement } = setupDeps;
    const api = workflowsManagement.management;
    this.api = api;

    const aiTelemetryClient = new WorkflowsAiTelemetryClient(coreSetup.analytics, this.logger);

    registerWorkflowAgentBuilderIntegration({
      agentBuilder,
      logger: this.logger,
      api,
      aiTelemetryClient,
    });

    agentContextLayer.registerType(createWorkflowSmlType(api));

    const platformTools: Array<BuiltinToolDefinition<any>> = [
      getWorkflowExecutionStatusTool({ workflowsManagement }),
      resumeWorkflowExecutionTool({ workflowsManagement }),
    ];
    platformTools.forEach((tool) => agentBuilder.tools.register(tool));

    return {};
  }

  start(
    coreStart: CoreStart,
    startDeps: PluginStartDependencies
  ): AgentBuilderWorkflowsPluginStart {
    if (this.api) {
      this.api.setSmlIndexAttachment(
        startDeps.agentContextLayer.indexAttachment,
        this.logger.get('sml')
      );
    }
    return {};
  }

  stop() {}
}
```

- [ ] **Step 10.2: Type-check**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean.

- [ ] **Step 10.3: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/server/plugin.ts
git commit -m "feat(agent-builder-workflows): wire server plugin setup/start"
```

---

## Task 11: Move public attachment renderers

**Files:**
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/index.ts`
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_attachment_renderer.tsx` (+ `.test.tsx`)
- Create: `x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_diff_attachment_renderer.tsx` (+ `.stories.tsx`)

- [ ] **Step 11.1: Copy renderer files**

```bash
mkdir -p x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types
cp src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers/workflow_yaml_attachment_renderer.tsx \
   x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_attachment_renderer.tsx
cp src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers/workflow_yaml_attachment_renderer.test.tsx \
   x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_attachment_renderer.test.tsx
cp src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers/workflow_yaml_diff_attachment_renderer.tsx \
   x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_diff_attachment_renderer.tsx
cp src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers/workflow_yaml_diff_attachment_renderer.stories.tsx \
   x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types/workflow_yaml_diff_attachment_renderer.stories.tsx
```

- [ ] **Step 11.2: Rewrite imports in `workflow_yaml_attachment_renderer.tsx`**

The renderer currently imports relatively from `workflows_management/public`. After the move, those become deep imports into `@kbn/workflows-management-plugin/public`. Specifically:

| Old | New |
|-----|-----|
| `'../../../../common'` (PLUGIN_ID) | `'@kbn/workflows-management-plugin/common'` |
| `'../../../common/lib/telemetry/types'` (`TelemetryServiceClient`) | `'@kbn/workflows-management-plugin/public/common/lib/telemetry/types'` |
| `'../../../common/service/telemetry'` (`WorkflowsBaseTelemetry`) | `'@kbn/workflows-management-plugin/public/common/service/telemetry'` |
| `'../../../shared/lib/query_client'` (`queryClient`) | `'@kbn/workflows-management-plugin/public/shared/lib/query_client'` |
| `'../../../widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme'` | `'@kbn/workflows-management-plugin/public/widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme'` |

If any of these deep import paths fail at runtime (path-mapped only at types level), the alternative is to ask the workflows_management public package to re-export these from a stable entry point. Mitigation: try the deep imports first, fall back to public re-exports if Kibana's bundler complains. (Kibana plugins routinely allow `@kbn/<plugin>/public/<path>` for sibling plugins.)

In `workflow_yaml_diff_attachment_renderer.tsx`, apply the same logic for any imports it has.

- [ ] **Step 11.3: Adapt the renderer's telemetry parameter**

The renderer's exported builder currently takes `services: { core: CoreStart; telemetry: TelemetryServiceClient }`. Per the spec, the new plugin must not consume `workflows_management`'s `TelemetryService.getClient()`. Construct the client from `core.analytics` directly inside the new plugin.

In `workflow_yaml_attachment_renderer.tsx`, change the exported builder's services parameter to accept `analytics: AnalyticsServiceStart` instead of `telemetry: TelemetryServiceClient`. Inside the builder, construct an ad-hoc client matching the `TelemetryServiceClient` shape:

```ts
import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import type { TelemetryServiceClient } from '@kbn/workflows-management-plugin/public/common/lib/telemetry/types';
import { WorkflowsBaseTelemetry } from '@kbn/workflows-management-plugin/public/common/service/telemetry';

export const createWorkflowYamlAttachmentUiDefinition = ({
  core,
  analytics,
}: {
  core: CoreStart;
  analytics: AnalyticsServiceStart;
}): AttachmentUIDefinition<WorkflowYamlAttachment> => {
  const telemetryClient: TelemetryServiceClient = {
    reportEvent: analytics.reportEvent.bind(analytics),
  };
  const telemetry = new WorkflowsBaseTelemetry(telemetryClient);
  // ... rest of original implementation, replacing `telemetryClient`/`telemetry` with the locals above
};
```

This preserves the `WorkflowsBaseTelemetry` domain telemetry behavior (the spec's intent was to drop the *client* concept from the public renderer signature, not to drop domain telemetry).

- [ ] **Step 11.4: Create `attachment_types/index.ts`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import { createWorkflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';
import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
} from '../../common/constants';

export const registerWorkflowAttachmentRenderers = (
  attachments: AttachmentServiceStartContract,
  services: {
    core: CoreStart;
    analytics: AnalyticsServiceStart;
  }
): void => {
  attachments.addAttachmentType(
    WORKFLOW_YAML_ATTACHMENT_TYPE,
    createWorkflowYamlAttachmentUiDefinition(services)
  );
  attachments.addAttachmentType(
    WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    workflowYamlDiffAttachmentUiDefinition
  );
};
```

- [ ] **Step 11.5: Update the renderer test**

In `workflow_yaml_attachment_renderer.test.tsx`, replace the `TelemetryServiceClient` mock with an `AnalyticsServiceStart` mock:

```ts
// Old (delete):
const telemetryClient: TelemetryServiceClient = { reportEvent: jest.fn() };
// Pass via services.telemetry

// New:
const analytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceStart;
// Pass via services.analytics
```

Update any test assertions that referenced `telemetryClient.reportEvent` to reference `analytics.reportEvent`.

- [ ] **Step 11.6: Run renderer tests**

Run: `yarn jest x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types`
Expected: PASS.

- [ ] **Step 11.7: Type-check**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean. Add any missing `kbn_references` (likely `@kbn/agent-builder-browser`, `@kbn/workflows-ui`, `@kbn/code-editor`, `@kbn/kibana-react-plugin`, `@kbn/i18n`).

- [ ] **Step 11.8: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/public/attachment_types \
        x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json
git commit -m "feat(agent-builder-workflows): copy public attachment renderers"
```

---

## Task 12: Wire public `plugin.tsx`

**Files:**
- Modify: `x-pack/platform/plugins/shared/agent_builder_workflows/public/plugin.tsx`

- [ ] **Step 12.1: Replace `public/plugin.tsx` with the wired implementation**

```tsx
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { first } from 'rxjs';
import { registerWorkflowAttachmentRenderers } from './attachment_types';
import type {
  AgentBuilderWorkflowsPluginSetup,
  AgentBuilderWorkflowsPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';

export class AgentBuilderWorkflowsPlugin
  implements
    Plugin<
      AgentBuilderWorkflowsPluginSetup,
      AgentBuilderWorkflowsPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderWorkflowsPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderWorkflowsPluginSetup {
    coreSetup.uiSettings
      .get$<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)
      .pipe(first((enabled) => enabled))
      .subscribe(async () => {
        const [coreStart, depsStart] = await coreSetup.getStartServices();
        registerWorkflowAttachmentRenderers(depsStart.agentBuilder.attachments, {
          core: coreStart,
          analytics: coreStart.analytics,
        });
      });

    return {};
  }

  start(
    coreStart: CoreStart,
    startDeps: PluginStartDependencies
  ): AgentBuilderWorkflowsPluginStart {
    return {};
  }

  stop() {}
}
```

Note: Because `agentBuilder` is a *required* browser dep declared in `kibana.jsonc`, `depsStart.agentBuilder` is guaranteed defined by Kibana — no `core.plugins.onStart('agentBuilder')` indirection is needed.

- [ ] **Step 12.2: Type-check**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json`
Expected: Clean. Add `@kbn/management-settings-ids` to `kbn_references` if not yet present.

- [ ] **Step 12.3: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_workflows/public/plugin.tsx \
        x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json
git commit -m "feat(agent-builder-workflows): wire public plugin to register renderers"
```

---

## Task 13: Remove platform workflow tools from `agent_builder_platform`

**Files:**
- Delete: `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/get_workflow_execution_status.ts`
- Delete: `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.ts`
- Delete: `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.test.ts`
- Modify: `x-pack/platform/plugins/shared/agent_builder_platform/server/tools/index.ts`
- Modify: `x-pack/platform/plugins/shared/agent_builder_platform/server/types.ts`
- Modify: `x-pack/platform/plugins/shared/agent_builder_platform/kibana.jsonc`

- [ ] **Step 13.1: Delete the three files**

```bash
rm x-pack/platform/plugins/shared/agent_builder_platform/server/tools/get_workflow_execution_status.ts
rm x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.ts
rm x-pack/platform/plugins/shared/agent_builder_platform/server/tools/resume_workflow_execution.test.ts
```

- [ ] **Step 13.2: Edit `server/tools/index.ts`** — remove the two imports (lines 26–27) and the `if (setupDeps.workflowsManagement) { tools.push(...) }` block (lines 52–57). The final file:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { productDocumentationTool } from './product_documentation';
import { integrationKnowledgeTool } from './integration_knowledge';
import type {
  AgentBuilderPlatformPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from '../types';
import { casesTool } from './cases/cases';
import { getDocumentByIdTool } from './get_document_by_id';
import { getIndexMappingsTool } from './get_index_mapping';
import { listIndicesTool } from './list_indices';
import { indexExplorerTool } from './index_explorer';
import { generateEsqlTool } from './generate_esql';
import { executeEsqlTool } from './execute_esql';
import { searchTool } from './search';
import { createVisualizationTool } from './create_visualization';

export const registerTools = ({
  coreSetup,
  setupDeps,
}: {
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>;
  setupDeps: PluginSetupDependencies;
}) => {
  const { agentBuilder } = setupDeps;

  const tools: Array<BuiltinToolDefinition<any>> = [
    searchTool({ coreSetup, topSnippetsDefaults: agentBuilder.topSnippets }),
    getDocumentByIdTool(),
    executeEsqlTool(),
    generateEsqlTool(),
    getIndexMappingsTool(),
    listIndicesTool(),
    indexExplorerTool(),
    createVisualizationTool(),
    productDocumentationTool(coreSetup),
    integrationKnowledgeTool(coreSetup),
    casesTool(coreSetup),
  ];

  tools.forEach((tool) => {
    agentBuilder.tools.register(tool);
  });
};
```

- [ ] **Step 13.3: Edit `server/types.ts`** — remove the `WorkflowsServerPluginSetup` import and the `workflowsManagement?` field:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
} from '@kbn/agent-context-layer-plugin/server';
import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface PluginSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer: AgentContextLayerPluginSetup;
  actions: ActionsPluginSetup;
}

export interface PluginStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  agentContextLayer: AgentContextLayerPluginStart;
  llmTasks?: LlmTasksPluginStart;
  cases?: CasesServerStart;
  spaces?: SpacesPluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentBuilderPlatformPluginStart {}
```

- [ ] **Step 13.4: Edit `kibana.jsonc`** — remove `"workflowsManagement"` from `optionalPlugins`:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/agent-builder-platform-plugin",
  "owner": "@elastic/workchat-eng",
  "group": "platform",
  "visibility": "shared",
  "plugin": {
    "id": "agentBuilderPlatform",
    "server": true,
    "browser": true,
    "configPath": ["xpack", "agentBuilderPlatform"],
    "requiredPlugins": ["actions", "agentBuilder", "agentContextLayer", "share"],
    "requiredBundles": [],
    "optionalPlugins": ["cases", "esql", "llmTasks"],
    "extraPublicDirs": []
  }
}
```

- [ ] **Step 13.5: Type-check `agent_builder_platform`**

Run: `node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_platform/tsconfig.json`
Expected: Clean. If type-check complains about an unused `@kbn/workflows-management-plugin` reference, remove it from `agent_builder_platform/tsconfig.json` `kbn_references`.

- [ ] **Step 13.6: Commit**

```bash
git add x-pack/platform/plugins/shared/agent_builder_platform
git commit -m "refactor(agent-builder-platform): remove workflow execution tools (moved to agent-builder-workflows)"
```

---

## Task 14: Remove server-side AB integration from `workflows_management`

**Files:**
- Delete: `src/platform/plugins/shared/workflows_management/server/agent_builder/` (whole tree)
- Delete: `src/platform/plugins/shared/workflows_management/server/telemetry/workflows_ai_telemetry_client.ts` (+ test)
- Delete: `src/platform/plugins/shared/workflows_management/server/telemetry/events/workflows_ai_edit_result.ts`
- Modify: `src/platform/plugins/shared/workflows_management/server/plugin.ts`
- Modify: `src/platform/plugins/shared/workflows_management/kibana.jsonc`

- [ ] **Step 14.1: Delete files**

```bash
rm -rf src/platform/plugins/shared/workflows_management/server/agent_builder
rm src/platform/plugins/shared/workflows_management/server/telemetry/workflows_ai_telemetry_client.ts
rm src/platform/plugins/shared/workflows_management/server/telemetry/workflows_ai_telemetry_client.test.ts
rm src/platform/plugins/shared/workflows_management/server/telemetry/events/workflows_ai_edit_result.ts
```

`server/telemetry/events.ts` and `server/telemetry/events/` (the directory) stay if other event schemas remain. After the delete above, the `events/` directory should be empty — remove it too:

```bash
rmdir src/platform/plugins/shared/workflows_management/server/telemetry/events
```

- [ ] **Step 14.2: Edit `server/plugin.ts`** — remove all workflow Agent Builder integration. Final state:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { defineRoutes } from './api/routes';
import { WorkflowsManagementApi } from './api/workflows_management_api';
import { WorkflowsService } from './api/workflows_management_service';
import { AvailabilityUpdater } from './availability';
import { createWorkflowsClientProvider } from './client/workflows_client';
import type { WorkflowsManagementConfig } from './config';
import {
  getWorkflowsConnectorAdapter,
  getConnectorType as getWorkflowsConnectorType,
} from './connectors/workflows';
import { WorkflowsManagementFeatureConfig } from './features';
import type {
  WorkflowsRequestHandlerContext,
  WorkflowsServerPluginSetup,
  WorkflowsServerPluginSetupDeps,
  WorkflowsServerPluginStart,
  WorkflowsServerPluginStartDeps,
} from './types';
import { registerUISettings } from './ui_settings';
import { stepSchemas } from '../common/step_schemas';

export class WorkflowsPlugin
  implements
    Plugin<
      WorkflowsServerPluginSetup,
      WorkflowsServerPluginStart,
      WorkflowsServerPluginSetupDeps,
      WorkflowsServerPluginStartDeps
    >
{
  private readonly logger: Logger;
  private config: WorkflowsManagementConfig;
  private availabilityUpdater: AvailabilityUpdater | null = null;
  private api: WorkflowsManagementApi | null = null;

  constructor(initializerContext: PluginInitializerContext<WorkflowsManagementConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<WorkflowsManagementConfig>();
  }

  public setup(
    core: CoreSetup<WorkflowsServerPluginStartDeps>,
    plugins: WorkflowsServerPluginSetupDeps
  ) {
    this.logger.debug('Workflows Management: Setup');

    registerUISettings(core, plugins);

    plugins.features?.registerKibanaFeature(WorkflowsManagementFeatureConfig);

    this.logger.debug('Workflows Management: Creating workflows service');

    const workflowsService = new WorkflowsService(core.getStartServices, this.logger);

    const api = new WorkflowsManagementApi(workflowsService, this.config.available);
    this.api = api;

    if (plugins.actions) {
      plugins.actions.registerType(getWorkflowsConnectorType(api));

      if (plugins.alerting) {
        plugins.alerting.registerConnectorAdapter(getWorkflowsConnectorAdapter());
      }
    }

    plugins.workflowsExtensions.registerWorkflowsClientProvider(
      createWorkflowsClientProvider(workflowsService, this.config, this.logger)
    );

    const spaces = plugins.spaces.spacesService;

    const router = core.http.createRouter<WorkflowsRequestHandlerContext>();
    defineRoutes(router, api, this.logger, spaces, workflowsService);

    return {
      management: api,
    };
  }

  public start(core: CoreStart, plugins: WorkflowsServerPluginStartDeps) {
    this.logger.debug('Workflows Management: Start');

    stepSchemas.initialize(plugins.workflowsExtensions);

    if (this.api) {
      this.availabilityUpdater = new AvailabilityUpdater({
        licensing: plugins.licensing,
        config: this.config,
        api: this.api,
        logger: this.logger,
      });
    }

    this.logger.debug('Workflows Management: Started');
    return {};
  }

  public stop() {
    this.availabilityUpdater?.stop();
  }
}
```

Removed: `aiTelemetryClient` field, `WorkflowsAiTelemetryClient` import, `registerWorkflowAgentBuilderIntegration` import, `createWorkflowSmlType` import, `agentContextLayer` types, `setupAiIntegration` method and call. The `setSmlIndexAttachment` call in `start` is gone — the new plugin owns that.

- [ ] **Step 14.3: Edit `kibana.jsonc`** — remove `runtimePluginDependencies`:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/workflows-management-plugin",
  "owner": ["@elastic/workflows-eng"],
  "group": "platform",
  "visibility": "shared",
  "description": "This plugin contains the Workflows management application.",
  "plugin": {
    "id": "workflowsManagement",
    "configPath": ["workflowsManagement"],
    "browser": true,
    "server": true,
    "requiredBundles": ["kibanaReact", "kibanaUtils", "data"],
    "requiredPlugins": [
      "navigation",
      "taskManager",
      "actions",
      "workflowsExecutionEngine",
      "workflowsExtensions",
      "features",
      "security",
      "triggersActionsUi",
      "spaces",
      "esUiShared",
      "share",
      "stackConnectors",
      "data",
      "dataViews",
      "kql",
      "fieldFormats",
      "unifiedSearch",
      "embeddable",
      "licensing"
    ],
    "optionalPlugins": ["alerting", "serverless", "cloud"]
  }
}
```

- [ ] **Step 14.4: Type-check `workflows_management`**

Run: `node scripts/type_check --project src/platform/plugins/shared/workflows_management/tsconfig.json`
Expected: Clean. If imports of `@kbn/agent-builder-server`, `@kbn/agent-builder-common`, or `@kbn/agent-context-layer-plugin` are no longer needed, remove them from `tsconfig.json` `kbn_references`. Re-run if removal breaks something else; only remove what's actually unused.

- [ ] **Step 14.5: Commit**

```bash
git add src/platform/plugins/shared/workflows_management/server \
        src/platform/plugins/shared/workflows_management/kibana.jsonc \
        src/platform/plugins/shared/workflows_management/tsconfig.json
git commit -m "refactor(workflows-management): remove server-side AB integration (moved to agent-builder-workflows)"
```

---

## Task 15: Remove public-side AB integration from `workflows_management`

The `setupAiIntegration` method also populates `agentBuilderPromise` which is later read by `createWorkflowsStartServices` (line 242) so it can be exposed to consumers like `use_agent_builder_integration.ts` (which is NOT being moved). We must preserve that plumbing while removing the renderer registration.

**Files:**
- Delete: `src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers/` (whole tree)
- Modify: `src/platform/plugins/shared/workflows_management/public/features/ai_integration/index.ts`
- Modify: `src/platform/plugins/shared/workflows_management/public/plugin.ts`

- [ ] **Step 15.1: Delete renderer files**

```bash
rm -rf src/platform/plugins/shared/workflows_management/public/features/ai_integration/attachment_renderers
```

- [ ] **Step 15.2: Edit `public/features/ai_integration/index.ts`** — remove the renderer export. Final state:

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ProposalManager } from './proposed_changes';
export type { DiffHunk, ProposalManagerOptions } from './proposed_changes';

export { AttachmentBridge, baseProposalId } from './attachment_bridge';

export { ProposalTracker } from './proposal_tracker';
export type { ProposalStatus, ProposalRecord } from './proposal_tracker';
```

- [ ] **Step 15.3: Edit `public/plugin.ts` — simplify `setupAiIntegration` to keep `agentBuilderPromise` plumbing only**

Replace the existing `setupAiIntegration` private method (lines ~199–233) with:

```ts
  /**
   * Wires the agentBuilder start contract through `agentBuilderPromise` so the
   * workflow YAML editor's `use_agent_builder_integration` hook can consume it via
   * Kibana services. Renderer registration is handled by the agentBuilderWorkflows
   * plugin.
   */
  private setupAgentBuilderStart(
    core: CoreSetup<WorkflowsPublicPluginStartDependencies, WorkflowsPublicPluginStart>
  ): void {
    this.agentBuilderPromise = core.plugins
      .onStart<{ agentBuilder: AgentBuilderPluginStart }>('agentBuilder')
      .then(({ agentBuilder }) => (agentBuilder.found ? agentBuilder.contract : undefined))
      .catch(() => undefined);
  }
```

Update the call site (was `this.setupAiIntegration(core);`) to `this.setupAgentBuilderStart(core);`.

Remove the `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` import from this file (line 24). The hook `use_agent_builder_integration.ts` imports it independently — we are only removing the import in `plugin.ts`.

Remove the `first` rxjs import if it was only used by the deleted subscription block.

- [ ] **Step 15.4: Type-check `workflows_management`**

Run: `node scripts/type_check --project src/platform/plugins/shared/workflows_management/tsconfig.json`
Expected: Clean.

- [ ] **Step 15.5: Run `workflows_management` Jest suite (sanity)**

Run: `yarn jest src/platform/plugins/shared/workflows_management`
Expected: PASS. (Tests for the moved files are gone; tests for everything else still pass.)

- [ ] **Step 15.6: Commit**

```bash
git add src/platform/plugins/shared/workflows_management/public
git commit -m "refactor(workflows-management): remove AI attachment renderers (moved to agent-builder-workflows)"
```

---

## Task 16: Split `common/agent_builder/constants.ts`

**Files:**
- Modify: `src/platform/plugins/shared/workflows_management/common/agent_builder/constants.ts`

- [ ] **Step 16.1: Replace the file to keep only `WORKFLOW_YAML_CHANGED_EVENT`**

```ts
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOW_YAML_CHANGED_EVENT = 'workflow:yaml_changed';
```

(The `internalNamespaces` import, `WORKFLOW_YAML_ATTACHMENT_TYPE`, `WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE`, `WORKFLOW_SML_TYPE`, `workflowTool`, and `workflowTools` are all gone.)

- [ ] **Step 16.2: Repo-wide grep — confirm no leftover consumers in `workflows_management`**

```bash
grep -rn "WORKFLOW_YAML_ATTACHMENT_TYPE\|WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE\|WORKFLOW_SML_TYPE\|workflowTools\b" \
  src/platform/plugins/shared/workflows_management/ | grep -v target/
```

Expected: no hits. If any remain, those files must be updated to import from `@kbn/agent-builder-workflows-plugin/common` (or the consumer should be moved if it was overlooked).

- [ ] **Step 16.3: Type-check both plugins**

Run:
```bash
node scripts/type_check --project src/platform/plugins/shared/workflows_management/tsconfig.json
node scripts/type_check --project x-pack/platform/plugins/shared/agent_builder_workflows/tsconfig.json
```
Expected: Both clean.

- [ ] **Step 16.4: Commit**

```bash
git add src/platform/plugins/shared/workflows_management/common/agent_builder/constants.ts
git commit -m "refactor(workflows-management): retain only WORKFLOW_YAML_CHANGED_EVENT after constants split"
```

---

## Task 17: Final repo-wide verification

- [ ] **Step 17.1: Repo-wide constant ownership grep**

```bash
grep -rn "WORKFLOW_YAML_ATTACHMENT_TYPE\|WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE\|WORKFLOW_SML_TYPE\b\|workflowTools\b" \
  src/ x-pack/ --include="*.ts" --include="*.tsx" 2>/dev/null \
  | grep -v target/
```

Expected: hits only inside `x-pack/platform/plugins/shared/agent_builder_workflows/`.

- [ ] **Step 17.2: Repo-wide telemetry client ownership grep**

```bash
grep -rn "WorkflowsAiTelemetryClient" src/ x-pack/ --include="*.ts" 2>/dev/null | grep -v target/
```

Expected: hits only inside `x-pack/platform/plugins/shared/agent_builder_workflows/`.

- [ ] **Step 17.3: Repo-wide registration uniqueness grep**

```bash
grep -rn "registerWorkflowAgentBuilderIntegration\|registerWorkflowAttachmentRenderers\|createWorkflowSmlType" \
  src/ x-pack/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v target/
```

Expected: each function is *defined* in `agent_builder_workflows` and *called* only from `agent_builder_workflows/{server,public}/plugin.{ts,tsx}`.

- [ ] **Step 17.4: Verify platform tools are registered exactly once**

```bash
grep -rn "getWorkflowExecutionStatusTool\|resumeWorkflowExecutionTool" \
  src/ x-pack/ --include="*.ts" 2>/dev/null | grep -v target/ | grep -v test
```

Expected: hits only inside `agent_builder_workflows/server/{plugin.ts,tools/}`.

- [ ] **Step 17.5: Run Jest for both plugins**

```bash
yarn jest x-pack/platform/plugins/shared/agent_builder_workflows
yarn jest src/platform/plugins/shared/workflows_management
yarn jest x-pack/platform/plugins/shared/agent_builder_platform
```

Expected: all PASS.

- [ ] **Step 17.6: Run repo-wide type-check**

Run: `node scripts/type_check`
Expected: Clean across the whole repo (this catches any consumer of the moved code that we missed).

- [ ] **Step 17.7: Boot the dev server and smoke-test**

```bash
yarn start
```

Manual checks (in browser, with `agentBuilder:experimentalFeatures` enabled):
1. Open Agent Builder, start a chat — confirm the workflow authoring skill is available.
2. Trigger a workflow YAML attachment — confirm the renderer mounts (no "no renderer for type workflow.yaml" error).
3. Resume a paused workflow execution from a chat — confirm `resume_workflow_execution` tool registers and runs.

If any of these regress, debug before merging. Do not add a fix-up commit that papers over a runtime registration mismatch — instead trace back to which task left things in an inconsistent state.

- [ ] **Step 17.8: Final commit (if any cleanup remains, e.g., unused tsconfig refs found during verification)**

```bash
git status
# review any remaining changes; commit if appropriate, otherwise this step is a no-op
```

---

## Self-Review

**Spec coverage:**
- Plugin manifest with required deps → Task 1.1 ✓
- Constants split (4 move, 1 stays) → Tasks 2 + 16 ✓
- SML type deep import → Task 4.1 ✓
- WorkflowsAiTelemetryClient + event schema move → Task 3 ✓
- Skills, attachments, tools, integration helper → Tasks 5–8 ✓
- Platform tools (`get_workflow_execution_status`, `resume_workflow_execution`) → Tasks 9 + 13 ✓
- Server plugin wiring (telemetry construction, integration call, SML type, `setSmlIndexAttachment` in start) → Task 10 ✓
- Public renderer move (rename `attachment_renderers` → `attachment_types`, drop `TelemetryServiceClient` from signature) → Task 11 ✓
- Public plugin wiring (uiSetting gating) → Task 12 ✓
- Removal from `agent_builder_platform` → Task 13 ✓
- Removal from `workflows_management` server → Task 14 ✓
- Removal from `workflows_management` public, preserving `agentBuilderPromise` plumbing → Task 15 ✓
- Tests move with sources, mock paths updated → Tasks 3.5, 4, 5, 6, 7.4, 9.2, 11.5 ✓
- Final greps and verification → Task 17 ✓

**Spec deviations called out:**
- Task 11.3 instantiates `WorkflowsBaseTelemetry` from a `core.analytics`-backed adapter, rather than dropping all "client" usage. The spec's intent (drop the *parameter* type `TelemetryServiceClient` from the renderer signature) is met; the domain-telemetry class stays because it is what actually emits the workflow-domain events with metadata extraction. This is a tightening of the spec, not a contradiction.
- Task 15 preserves a simplified `setupAgentBuilderStart` (renamed from `setupAiIntegration`) in `workflows_management/public/plugin.ts`. The spec said to remove `setupAiIntegration` outright, but the `agentBuilderPromise` field it populates is consumed by `use_agent_builder_integration.ts`, which is not being moved. Full removal would break that consumer.

**Placeholder scan:** No "TBD"/"TODO"/vague-handoff phrases. Each step has either an exact command or full code.

**Type/name consistency:**
- `WorkflowsManagementApi` is referenced in Tasks 4, 6, 7, 8, 10. Each task either imports the type directly from `@kbn/workflows-management-plugin/server` if exported, or derives it via `WorkflowsServerPluginSetup['management']`. The plan flags this in Task 4.1 and applies the same fallback consistently downstream.
- `WorkflowsAiTelemetryClient` import path inside the new plugin is consistently `'./telemetry/workflows_ai_telemetry_client'` from sibling files in `server/` and `'../telemetry/workflows_ai_telemetry_client'` from `server/tools/` — verified in Tasks 7.2, 8.1, 10.1.
- `registerWorkflowAttachmentRenderers` signature changes from `{ telemetry: TelemetryServiceClient }` to `{ analytics: AnalyticsServiceStart }` — applied consistently in Tasks 11.4 (impl), 11.5 (test), and 12.1 (caller).
