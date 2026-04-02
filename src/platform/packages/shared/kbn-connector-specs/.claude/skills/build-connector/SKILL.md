---
name: build-connector
description: End-to-end orchestrator that creates a new connector from scratch, reviews the code, activates it in Kibana, tests it via an Agent Builder agent, iterates until quality is met, and delivers a polished result. Use when asked to build, develop, or implement a complete connector.
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Skill
argument-hint: [3rd-party-service-name]
---

# Build a Connector End-to-End

This skill orchestrates the full lifecycle of building a new connector for **$ARGUMENTS**. It chains together multiple skills and performs code review and quality verification between each stage.

## Prerequisites

This skill depends on skills from other plugins. Before starting, ensure they are loaded:

- **`create-agent`** and **`chat-with-agent`** — from `x-pack/platform/plugins/shared/agent_builder/.claude/skills/`. Load them by reading the SKILL.md files at `**/agent_builder/**/SKILL.md`.

If these skills are not available when needed (Tasks 6–7), the agent creation and chat testing steps will fail.

## Step 0: Create the Task List

Use `TaskCreate` to create all of the following tasks up front so the user can see the full plan. Set all tasks to `pending` initially.

1. **Create the connector code** — "Generate connector spec, workflows, types, and documentation for $ARGUMENTS"
2. **Code review** — "Review generated connector files for correctness and completeness"
3. **Edit based on review** — "Fix issues found during code review"
4. **Wait for Kibana** — "Ask user to start Elasticsearch and Kibana"
5. **Activate the connector** — "Create a connector instance in running Kibana"
6. **Create a test agent** — "Create an Agent Builder agent wired to the new connector tools"
7. **Chat test** — "Send a test message to the agent and observe tool calls"
8. **Verify tool call quality** — "Analyze chat results for successful tool executions"
9. **Iterate on quality** — "Fix code issues and re-test until quality bar is met"
10. **Final code review** — "Final review of all generated files and documentation"
11. **Final chat test** — "Final end-to-end conversation to confirm everything works"
12. **Report completion** — "Tell the user the connector is ready for manual inspection"

Set up dependencies: task 2 is blocked by 1, task 3 by 2, task 4 by 3, and so on sequentially.

Then begin working through the tasks in order.

---

## Task 1: Create the Connector Code

Mark task 1 as `in_progress`.

Invoke the `create-connector` skill with `$ARGUMENTS` as the argument:

```
Skill: create-connector
Args: $ARGUMENTS
```

This runs in a forked context and will generate:
- A connector specification with actions, types, and icon (in `src/platform/packages/shared/kbn-connector-specs/src/specs/`)
- Workflow YAML files alongside the spec
- Documentation for the connector (in `docs/reference/connectors-kibana/`)

When complete, mark task 1 as `completed`.

---

## Task 2: Code Review

Mark task 2 as `in_progress`.

Review the files generated in Task 1 using the **review-connector** skill. Apply its checklist to the connector spec, workflows, and docs.

List all issues found. If no issues are found, note that the code looks good.

Mark task 2 as `completed`.

---

## Task 3: Edit Based on Review

Mark task 3 as `in_progress`.

If issues were found in Task 2, fix them using the `Edit` tool. After fixing, re-read the files and verify the fixes are correct.

If the fixes are significant, do another review pass. Repeat the review/edit cycle until you're satisfied with the quality — typically 1-2 iterations.

Mark task 3 as `completed`.

---

## Task 4: Wait for Kibana

Mark task 4 as `in_progress`.

Use `AskUserQuestion` to ask the user to start Elasticsearch and Kibana:

> To test the connector, I need Elasticsearch and Kibana running. Please start them if they aren't already:
>
> ```
> yarn es snapshot          # in one terminal
> yarn start                # in another terminal
> ```
>
> Let me know when both are ready.

Wait for the user's confirmation. Once confirmed, verify by running:

```bash
src/platform/packages/shared/kbn-connector-specs/.claude/skills/activate-connector/scripts/list_connector_types.sh
```

If this fails, tell the user Kibana isn't reachable yet and ask them to try again.

Mark task 4 as `completed`.

---

## Task 5: Activate the Connector

Mark task 5 as `in_progress`.

Invoke the `activate-connector` skill:

```
Skill: activate-connector
Args: $ARGUMENTS
```

This will list available types, ask the user for credentials, and create the connector instance via the Actions API. When `agentBuilder:connectorsEnabled` is true, workflows and tools are auto-created.

Mark task 5 as `completed`.

---

## Task 6: Create a Test Agent

Mark task 6 as `in_progress`.

Invoke the `create-agent` skill:

```
Skill: create-agent
Args: $ARGUMENTS Agent
```

When the skill asks for tool selection, suggest including **all connector tools** for the newly activated connector (and no platform tools, to keep the test focused).

Mark task 6 as `completed`.

---

## Task 7: Chat Test

Mark task 7 as `in_progress`.

Invoke the `chat-with-agent` skill to test the agent. Use the agent ID created in Task 6. The default prompt should be:

> Summarize the data available to you through your tools.

```
Skill: chat-with-agent
Args: <agent-id-from-task-6>
```

Capture and analyze the full output (reasoning, tool calls, tool results, response).

Mark task 7 as `completed`.

---

## Task 8: Verify Tool Call Quality

Mark task 8 as `in_progress`.

Analyze the chat output from Task 7. Check each criterion:

### Success Criteria
- [ ] **Tool calls executed**: The agent attempted to use the connector tools
- [ ] **No execution failures**: Tool results do NOT contain `"status":"failed"` (unless the failure is due to auth/credential issues, which are not code problems)
- [ ] **Meaningful results**: Tool results contain actual data, not empty arrays or error messages
- [ ] **Coherent response**: The agent's final response makes sense and references the data

### Failure Analysis
If tools failed (tool results contain `"status":"failed"`):
1. **Get the execution details** to see the actual error. Extract the `execution_id` from the tool result and call:
   ```bash
   source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh" && kibana_curl "$KIBANA_URL/api/workflowExecutions/<execution_id>" > /tmp/wf_exec.json
   ```
   Then read `/tmp/wf_exec.json` and check `error.message` and `stepExecutions[].error.message`.
2. **Common errors:**
   - `Unknown tool: 'tool-name'` — MCP tool name is wrong (likely hyphens vs underscores). Verify via `listTools` sub-action on the connector.
   - `Unexpected keyword argument` — the workflow passes a parameter the tool doesn't accept. Remove it from the workflow YAML.
   - `Input should be 'X'` — a parameter value is invalid. Fix the workflow input constraints.
   - Auth/credential errors — note this but don't count as code failure. Ask user to re-provide credentials.
3. If the error is a **workflow issue** (wrong tool name, invalid parameters, bad Liquid template) — this needs code fixes.
4. If the error is a **connector issue** (wrong auth config, wrong server URL) — this needs code fixes.

Mark task 8 as `completed` and note whether iteration is needed.

---

## Task 9: Iterate on Quality

Mark task 9 as `in_progress`.

If Task 8 found code issues:

1. **Diagnose**: Identify which files need changes (connector spec, workflows, types)
2. **Verify MCP tool names** (if MCP-native): Use the `listTools` action to discover actual tool names and schemas:
   ```bash
   source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh" && kibana_curl -X POST -H "Content-Type: application/json" \
     "$KIBANA_URL/api/actions/connector/<connector_id>/_execute" \
     -d '{"params":{"subAction":"listTools","subActionParams":{}}}'
   ```
3. **Fix**: Use `Edit` to fix the identified issues
4. **Re-activate**: The connector may need to be deleted and re-created to pick up changed workflows. Wait ~60 seconds for Kibana to hot-reload server-side changes, then re-invoke `/activate-connector`.
5. **Re-test**: Run another chat test using `/chat-with-agent`
6. **Re-verify**: Check tool call quality again

Repeat this loop up to 3 times. If issues persist after 3 iterations, report the remaining problems to the user and move on.

If Task 8 found NO code issues, skip this task entirely.

Mark task 9 as `completed`.

---

## Task 10: Final Code Review

Mark task 10 as `in_progress`.

Do one final review using the **review-connector** skill. Verify no TODOs/placeholders, consistent naming, no debug artifacts. The review skill will also run docs quality checks (`docs-check-style`, `crosslink-validator`, `frontmatter-audit`, `content-type-checker`, `applies-to-tagging`) on any connector docs. Make any final minor fixes if needed.

Mark task 10 as `completed`.

---

## Task 11: Final Chat Test

Mark task 11 as `in_progress`.

Run one final chat conversation to confirm everything works end-to-end:

```
Skill: chat-with-agent
Args: <agent-id>
```

Use a more specific prompt this time, something like:
> Search for recent items and give me a detailed summary of what you find.

Verify the agent successfully calls tools, gets results, and produces a useful response.

Mark task 11 as `completed`.

---

## Task 12: Report Completion

Mark task 12 as `completed`.

Tell the user something like the below template, listing the actual file paths that were created or modified during the process:

> The **$ARGUMENTS** connector is ready for manual inspection. Here's what was created:
>
> **Files created/modified:**
> - Connector spec: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/...`
> - Workflows: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/workflows/...`
> - Documentation: `docs/reference/connectors-kibana/<name>-action-type.md`
>
> **Kibana state:**
> - Connector created with ID: `<id>`
> - Workflows and tools auto-created via lifecycle handler
> - Test agent created with ID: `<id>`
> - Test conversations available in Agent Builder
>
> **Next steps:**
> 1. Open Kibana and navigate to the Agent Builder to inspect the agent
> 2. Try chatting with the agent in the Kibana UI
> 3. Review the generated code and adjust as needed
> 4. When satisfied, commit the code changes

List the actual file paths that were created or modified during the process.
