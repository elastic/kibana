# agentBuilderWorkflows: migrate workflow Agent Builder primitives

## Goal

Move all Agent Builder primitives related to workflows out of `agent_builder_platform` and `workflows_management` into the newly scaffolded `agent_builder_workflows` plugin (at `x-pack/platform/plugins/shared/agent_builder_workflows`).

The migration is mechanical: existing tool ids, attachment types, event names, skill ids, and telemetry event types stay the same. No behavior changes.

## Scope

In scope:

- Move two workflow tools out of `agent_builder_platform`.
- Move the entire `server/agent_builder/` tree out of `workflows_management`.
- Move `WorkflowsAiTelemetryClient` and its event schema out of `workflows_management`.
- Move the public attachment renderers out of `workflows_management`.
- Split the workflow Agent Builder constants file (one constant stays, the rest move).
- Wire the new plugin's setup/start to register everything that was previously registered by the source plugins.
- Move the corresponding tests, updating import paths only.
- Single PR.

Out of scope:

- Any refactor of `WorkflowsManagementApi` or its consumers.
- Any rename of tool ids, attachment types, event names, skill ids.
- Any new public-side contract on the new plugin.
- Any changes to `@kbn/agent-builder-common/tools/constants.ts` (the two platform tool ids stay).

## Target plugin shape

```
x-pack/platform/plugins/shared/agent_builder_workflows/
  kibana.jsonc
  tsconfig.json
  jest.config.js
  moon.yml
  README.md
  common/
    constants.ts                # WORKFLOW_YAML_ATTACHMENT_TYPE, WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
                                # WORKFLOW_SML_TYPE, workflowTools
    index.ts
  public/
    index.ts
    plugin.tsx                  # uiSetting-gated registration of attachment renderers
    types.ts
    attachment_types/           # renamed from attachment_renderers
      index.ts                  # registerWorkflowAttachmentRenderers
      workflow_yaml_attachment_renderer.tsx
      workflow_yaml_attachment_renderer.test.tsx
      workflow_yaml_diff_attachment_renderer.tsx
      workflow_yaml_diff_attachment_renderer.stories.tsx
  server/
    index.ts
    plugin.ts                   # builds telemetry client, registers tools/skills/attachments,
                                # registers SML type and indexAttachment
    types.ts
    config.ts
    register_workflow_agent_builder_integration.ts
    attachment_types/           # renamed from attachments
      workflow_yaml_attachment.ts
      workflow_yaml_attachment.test.ts
      workflow_yaml_diff_attachment.ts
      workflow_yaml_diff_attachment.test.ts
    skills/
      workflow_authoring_skill.ts
      workflow_authoring_skill.test.ts
    sml_types/
      workflow.ts                # deep-imports workflowIndexName + WorkflowProperties
      workflow.test.ts
    telemetry/
      workflows_ai_telemetry_client.ts
      workflows_ai_telemetry_client.test.ts
      events/
        workflows_ai_edit_result.ts
    tools/
      get_workflow_execution_status.ts        # from agent_builder_platform
      resume_workflow_execution.ts            # from agent_builder_platform
      resume_workflow_execution.test.ts       # from agent_builder_platform
      validate_workflow_tool.ts(+test)
      get_step_definitions_tool.ts(+tests)
      get_trigger_definitions_tool.ts(+test)
      get_connectors_tool.ts(+test)
      get_examples_tool.ts(+test)
      workflow_execute_step_tool.ts(+test)
      workflow_edit_tools.ts
      yaml_edit_utils.ts(+test)
```

## Plugin manifest (`kibana.jsonc`)

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

`workflowsManagement` is a required dependency. The new plugin will not load when workflows is unavailable; that matches the move's intent (workflow-specific Agent Builder primitives belong with workflows).

## Constants split

`workflows_management/common/agent_builder/constants.ts` → split:

- **Stays in `workflows_management`** (`common/agent_builder/constants.ts`):
  - `WORKFLOW_YAML_CHANGED_EVENT`
- **Moves to `agent_builder_workflows/common/constants.ts`**:
  - `WORKFLOW_YAML_ATTACHMENT_TYPE`
  - `WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE`
  - `WORKFLOW_SML_TYPE`
  - `workflowTools` (and its `workflowTool` helper)

The new plugin imports `WORKFLOW_YAML_CHANGED_EVENT` from `@kbn/workflows-management-plugin/common/agent_builder/constants` (the existing path). The constants file there shrinks to just that export.

## SML type access to internal storage

`sml_types/workflow.ts` needs `workflowIndexName` and `WorkflowProperties` from `workflows_management/server/storage/workflow_storage`. We use a deep import:

```ts
import {
  workflowIndexName,
  type WorkflowProperties,
} from '@kbn/workflows-management-plugin/server/storage/workflow_storage';
```

No changes to `WorkflowsManagementApi` or to `workflow_storage` itself.

## Server-side wiring (`agent_builder_workflows/server/plugin.ts`)

Setup:

1. Construct `WorkflowsAiTelemetryClient` from `core.analytics` and the plugin logger. (Constructor registers the `workflows_ai_edit_result` event type.)
2. Synchronously call `registerWorkflowAgentBuilderIntegration({ agentBuilder: deps.agentBuilder, logger, api: deps.workflowsManagement.management, aiTelemetryClient })`. (Both deps are required, so no `core.plugins.onSetup` indirection is needed.)
3. Synchronously register the workflow SML type with `deps.agentContextLayer.registerType(createWorkflowSmlType(deps.workflowsManagement.management))`.
4. Build the platform workflow tools and register them on `agentBuilder.tools`:
   - `getWorkflowExecutionStatusTool({ workflowsManagement: deps.workflowsManagement })`
   - `resumeWorkflowExecutionTool({ workflowsManagement: deps.workflowsManagement })`

   These two tools are not part of `register_workflow_agent_builder_integration` today; they were registered by `agent_builder_platform`. We register them directly in the new plugin's setup. (They could be folded into `register_workflow_agent_builder_integration` for consistency — leaving that as an optional cleanup, not a requirement.)
5. Stash the api reference for use in `start`.

Start:

- Call `api.setSmlIndexAttachment(deps.agentContextLayer.indexAttachment, logger.get('sml'))`. The api is the singleton stashed from setup; this matches today's behavior in `WorkflowsPlugin.start`.

Stop:

- No-op.

The `register_workflow_agent_builder_integration.ts` file moves verbatim except for import path updates.

## Browser-side wiring (`agent_builder_workflows/public/plugin.tsx`)

Reproduce the existing gating pattern from `workflows_management/public/plugin.ts:206-233`:

```ts
core.uiSettings
  .get$<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)
  .pipe(first((enabled) => enabled))
  .subscribe(async () => {
    const { agentBuilder } = await core.plugins.onStart('agentBuilder');
    if (!agentBuilder.found) return;
    const [coreStart] = await core.getStartServices();
    registerWorkflowAttachmentRenderers(agentBuilder.contract.attachments, {
      core: coreStart,
      analytics: coreStart.analytics,
    });
  });
```

`AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` is imported from `@kbn/management-settings-ids` (current location).

`registerWorkflowAttachmentRenderers` signature changes: drop `TelemetryServiceClient` parameter, accept `analytics: AnalyticsServiceStart` (or pass `core.analytics`) directly. Inside renderer telemetry callsites, replace `telemetry.reportEvent(...)` with `analytics?.reportEvent(...)`. The `TelemetryServiceClient` wrapper stays in `workflows_management` for its other consumers; only the moved renderers stop using it.

## Changes outside the new plugin

### `agent_builder_platform`

- Delete `server/tools/get_workflow_execution_status.ts`.
- Delete `server/tools/resume_workflow_execution.ts` and its `.test.ts`.
- Remove the two imports and the `if (setupDeps.workflowsManagement) { tools.push(...) }` block in `server/tools/index.ts`.
- Remove `workflowsManagement?: WorkflowsServerPluginSetup` from `PluginSetupDependencies` in `server/types.ts` and the unused `@kbn/workflows-management-plugin/server` import.
- Remove `"workflowsManagement"` from `optionalPlugins` in `kibana.jsonc`.
- Remove the `@kbn/workflows-management-plugin` reference from `tsconfig.json` if no longer needed.

### `workflows_management`

- Delete `server/agent_builder/` (directory and all files: `register_workflow_agent_builder_integration.ts`, `index.ts`, `attachments/`, `skills/`, `sml_types/`, `tools/`).
- Delete `server/telemetry/workflows_ai_telemetry_client.ts` and its test.
- Delete `server/telemetry/events/workflows_ai_edit_result.ts`. (Sibling `events.ts` for `workflows_trigger_event_dispatched` stays.)
- Delete `public/features/ai_integration/attachment_renderers/` (directory).
- Update `public/features/ai_integration/index.ts`: drop the `registerWorkflowAttachmentRenderers` re-export. Other exports (`ProposalManager`, `AttachmentBridge`, `ProposalTracker`, etc.) stay.
- Update `public/plugin.ts`:
  - Remove the `setupAiIntegration` private method.
  - Remove its call site, the `agentBuilderPromise` field, and the `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` import (if no other use; it's still used in `widgets/workflow_yaml_editor/ui/hooks/use_agent_builder_integration.ts`, so the import stays in that file but is dropped from `plugin.ts`).
- Update `server/plugin.ts`:
  - Remove the `aiTelemetryClient` field, its constructor initialization, and the `registerWorkflowAgentBuilderIntegration` call.
  - Remove the `agentContextLayer` registration block (`onSetup` for SML type and `onStart` for `setSmlIndexAttachment`).
  - Remove the `setupAiIntegration` private method entirely.
  - Remove the `WorkflowsAiTelemetryClient` import and the `registerWorkflowAgentBuilderIntegration` import.
  - Remove the `createWorkflowSmlType` import.
  - The `agentBuilder` and `agentContextLayer` types/imports go too.
- Update `kibana.jsonc`: remove `runtimePluginDependencies: ["agentBuilder", "agentContextLayer"]`.
- Update `common/agent_builder/constants.ts`: keep only `WORKFLOW_YAML_CHANGED_EVENT`. Remove unused `internalNamespaces` import.
- Verify `tsconfig.json` `kbn_references` no longer needs `@kbn/agent-builder-server`, `@kbn/agent-builder-common`, `@kbn/agent-context-layer-plugin` (only after move; some may still be needed by remaining code — confirm during the work, do not pre-remove).

### `@kbn/agent-builder-common/tools/constants.ts`

No changes. `platformCoreTools.getWorkflowExecutionStatus` and `platformCoreTools.resumeWorkflowExecution` stay; they remain in `defaultAgentToolIds`.

## Tests

- Server tests move with their source files. Imports are rewritten:
  - `../../api/workflows_management_api` → `@kbn/workflows-management-plugin/server` (using `WorkflowsManagementApi` type).
  - `../../telemetry/workflows_ai_telemetry_client` → relative path inside the new plugin.
  - `../../../common/agent_builder/constants` → `../../common/constants` (or `@kbn/agent-builder-workflows-plugin/common/constants` from server-side tests if cross-folder relative gets ugly).
- Public tests move with their source files. `TelemetryServiceClient` mock is replaced with an `AnalyticsServiceStart` mock (`{ reportEvent: jest.fn() }`).
- No assertion changes.

## Repo manifest updates

- `tsconfig.base.json`: already maps `@kbn/agent-builder-workflows-plugin` (done in scaffold commit).
- `.github/CODEOWNERS`: confirm entry for the new plugin path exists; add if missing.
- `.buildkite` / Jest config: the new plugin already ships its own `jest.config.js`. No global registry changes required.

## Risks and mitigations

- **Test path drift.** Mechanical move of ~20 test files; risk of broken relative imports and mock paths. Mitigation: run the full Jest suite for both `agent_builder_workflows` and `workflows_management` after the move, plus type-check.
- **SML registration order.** Currently SML registration uses `core.plugins.onSetup('agentContextLayer')` because it was optional. The new plugin makes it required, so synchronous registration is safe; no race risk.
- **Public-side renderer gating.** Renderer registration must remain idempotent and gated on the same uiSetting. Risk: subtle change in subscription lifecycle if implemented differently. Mitigation: copy the existing pattern verbatim (uiSetting `get$ → first(enabled) → register`).
- **Hidden constants consumer.** The split assumes only the moved files use the moving constants. Mitigation: a final repo-wide grep for each constant before merging.
- **`agent_builder_platform` `tsconfig` and bundle references.** Removing the `@kbn/workflows-management-plugin` reference may surface a transitive dep used elsewhere. Mitigation: only remove if a clean type-check passes; otherwise leave it.

## Acceptance criteria

- All moved primitives compile and type-check from the new plugin.
- All moved tests pass in their new location.
- `agent_builder_platform` no longer references workflows tools or `workflowsManagement`.
- `workflows_management` no longer references `agentBuilder` server contracts, `agentContextLayer` server contracts, or `AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID` from `public/plugin.ts`.
- A repo-wide grep for `WORKFLOW_YAML_ATTACHMENT_TYPE`, `WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE`, `WORKFLOW_SML_TYPE`, `workflowTools` returns hits only from inside `agent_builder_workflows` (plus `target/` build artifacts).
- A repo-wide grep for `WorkflowsAiTelemetryClient` returns hits only from inside `agent_builder_workflows`.
- The two platform workflow tools are registered exactly once at runtime, by `agent_builder_workflows`.
- The workflow Agent Builder integration (skill, attachments, edit/validation tools) registers exactly once, on `agentBuilder.found`, via the new plugin.
- The SML workflow type registers exactly once with `agentContextLayer`, via the new plugin.
- The browser renderer registration still gates on `agentBuilder:experimentalFeatures` and registers exactly once when enabled.
