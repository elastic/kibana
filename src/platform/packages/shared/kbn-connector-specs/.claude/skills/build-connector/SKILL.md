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

1. **Create the connector code** — "Generate connector spec, types, and documentation for $ARGUMENTS"
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
12. **Compile the PR validation table** — "Build the `## Validated` action-by-action table for the PR description"
13. **Report completion** — "Tell the user the connector is ready for manual inspection"

Set up dependencies: task 2 is blocked by 1, task 3 by 2, task 4 by 3, and so on sequentially.

Then begin working through the tasks in order.

### If building several connectors as a batch, don't defer Tasks 4-11 for all of them

It's tempting, when asked to build many connectors, to build the code for all of them first (Task 1-3)
and defer activation/live-testing (Tasks 4-11) until later. In practice this is where most real bugs
surface — disabled test buttons, ICU parse errors, endpoints that reject partial updates, query params
the vendor rejects, an optional modifier param silently sent to the wrong place (query string vs. body),
wrong auth scopes — none of which unit tests or a code-only review catch, because
they only show up when the spec is actually loaded and exercised in a running Kibana. If the user
explicitly asks to defer live testing for a batch, still run the self-review checklist from
`create-connector`'s Step 4 ("Self-review before handing off") on every connector before considering it
code-complete, and flag to the user that the deferred connectors have not been runtime-verified and are
likely to need a fix-up pass once Tasks 4-11 finally run. Still produce the `## Validated` table for each
connector's PR (Task 12) — every row will read `⚠️ Not validated — needs manual verification` until live
testing happens, but the table itself is not optional; see
`create-connector/reference/pr-validation-table.md`.

Building several connectors in one session also leaks entries between them. Shared files (`toc.yml`,
the connector-list snippet, `all_specs.ts`, `connector_icons_map.ts`, `CODEOWNERS`) are edited for every
connector, and an entry for one can end up on another's branch: the AKS PR shipped a dangling Azure
DevOps entry in two docs files. Before committing each connector, diff those files and confirm every
added line belongs to that connector.

---

## Task 1: Create the Connector Code

Mark task 1 as `in_progress`.

After scaffolding and before writing actions, find the vendor's machine-readable spec and describe the
operations the planned actions call with `node scripts/connector_vendor_api --inspect --connector <id>`
(see "Start from the vendor's
spec" in `create-connector/reference/custom-connector-setup.md`): methods, parameter locations, array
encoding, bounds and scopes come from it. Then research the vendor's real API docs for what the spec
doesn't settle — specifically update semantics (partial vs. full-replace), per-action auth scopes, and
regional/self-hosted domain variants. See "Research the Vendor API Before Writing Any Code" in the same
file. Bugs that trace back to skipping this (wrong
auth scope, 400s on partial updates, 404s on regional domains) are far cheaper to avoid up front than to
find during Task 7's live chat test or after the PR is open.

Invoke the `create-connector` skill with `$ARGUMENTS` as the argument:

```
Skill: create-connector
Args: $ARGUMENTS
```

This runs in a forked context and will generate:
- A connector specification with actions, types, and icon (in `src/platform/packages/shared/kbn-connector-specs/src/specs/`)
- Documentation for the connector (in `docs/reference/connectors-kibana/`)

When complete, mark task 1 as `completed`.

---

## Task 2: Code Review

Mark task 2 as `in_progress`.

Review the files generated in Task 1 using the **review-connector** skill. Apply its checklist to the connector spec and docs.

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
> pnpm es snapshot          # in one terminal
> pnpm start                # in another terminal
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

This will list available types, ask the user for credentials, and create the connector instance via the Actions API. Creating the connector does not by itself grant any agent access to it — its ID must be added to an agent's assigned connectors before that agent can call its sub-actions.

**If the user reports `Error: No widget found for schema type: ...`** when opening the connector
creation form in the Kibana UI, a config field in the connector's `schema` uses a Zod type the
form-generator has no widget for (a boolean, array, or record — numbers are supported). Fix it per
"Config fields must use a type the form-generator has a widget for" in
`create-connector/reference/connector-patterns.md`, then ask the user to retry.

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

This prompt only exercises reads. The bugs that most often ship are in mutating actions (a wrong HTTP
method, a wrong body envelope, a nested object that loses a field), and a read-only chat never reaches
them. After the chat test, call **every mutating action once directly** through
`POST /api/actions/connector/<id>/_execute` against a disposable resource, then read the resource back
to confirm the change took effect. Where the vendor documents resource variants (e.g. a DNS-only
cluster, a System node pool), run at least one action against each variant you can create. If a
mutation cannot be tested safely, record it as `⚠️ Not validated` in Task 12 rather than skipping it
silently.

A chat test also only reads the first page. For **every list action that pages**, fetch page 2
explicitly through `_execute`: take the cursor, next link or page number from the first response and pass
it back, with a small page size so a second page exists. Then compare what the vendor did with the
operation's `pagination` descriptor in `vendor_api/manifest.json`: the parameter that selects the page,
the page size parameter, where the next cursor sits in the response and what marks the last page. The
contract mock pages the connector according to that descriptor, so a wrong one passes the contract test
while the real API pages differently. Correct the descriptor, rerun
`node scripts/connector_vendor_api --connector <id>`, and note the page-2 call in the action's row in
Task 12.

A spec defect found while testing (a parameter the API takes but the spec lacks, a wrong type, a
documented limit the spec doesn't encode) goes into `vendor_api/overlay.yaml`, with what the real API did
as the action's `description`; see "Record the vendor API contract" in the `create-connector` skill.

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
1. **Check the sub-action error** to see the actual error. Look at the `message` field in the tool result.
2. **Common errors:**
   - `Unknown sub-action: 'name'` — the sub-action name is wrong. Verify via the connector spec's `actions` array.
   - `Unexpected parameter` — the tool call passes a parameter the sub-action doesn't accept. Fix the action's Zod schema.
   - `Input should be 'X'` — a parameter value is invalid. Fix the action's input constraints.
   - Auth/credential errors — note this but don't count as code failure. Ask user to re-provide credentials.
   - `404`/`Not found or unauthorized` on an action that **assigns, mentions, or otherwise targets a
     specific user** (e.g. `assignIncidentUser`, add-watcher, notify) — before concluding the endpoint or
     payload is wrong, check whether the target user ID belongs to the API key's own bound/service
     account. Some vendors (e.g. Rootly) reject certain user-targeting operations for that synthetic
     identity even though the ID format, payload shape, and endpoint are all otherwise correct. Retry with
     a different, real human user's ID from the same org before treating this as a connector bug — if that
     succeeds, the code is fine and this is just a property of the test data/account, not something to fix.
   - `Unknown type "..."` or `Cannot query field "..." on type "..."` on a GraphQL-backed connector — the
     hardcoded query/mutation string references a type or field name that doesn't exist in the vendor's
     real schema (a guessed/hallucinated name, not a live-data problem). Don't guess a fix from docs
     alone — verify the real name with a GraphQL introspection query (`__schema`/`__type`) run through a
     temporary debug action, per "Verify GraphQL Schemas via Introspection" in
     `create-connector/reference/custom-connector-setup.md`, then fix every occurrence of the wrong name
     (check sibling queries/mutations in the same file for the same mistake) and re-test.
   - **No error at all, but an optional modifier param (`scope`, a filter, an `all_X` flag) appears to have
     no effect** — e.g. a scoped mute/unmute or a filtered update behaves like an unscoped/unfiltered one.
     This is not a flaky vendor or a bad test value; it means the handler is sending that param in the
     query string when the vendor expects the request body (or vice versa), and the vendor is silently
     ignoring the misplaced field instead of erroring. Check the action's real API docs for where that
     specific param belongs, fix the handler, and check any sibling action (e.g. the corresponding
     mute/unmute or enable/disable pair) for the same mistake — don't assume the sibling is correct just
     because it wasn't the one that failed.
   - An error that names the wrong cause on a **mutating** call — e.g. Azure ARM's `InvalidAPIVersion`
     for a method the route does not support, or `UnmarshalError: unknown field "properties"` for a body
     wrapped in an envelope the route does not use. Before changing API versions or field names, check
     the route's method and body shape in the vendor's OpenAPI/swagger entry for that exact route.
3. If the error is a **sub-action issue** (wrong name, invalid parameters) — this needs code fixes.
4. If the error is a **connector issue** (wrong auth config, wrong server URL) — this needs code fixes.

Mark task 8 as `completed` and note whether iteration is needed.

---

## Task 9: Iterate on Quality

Mark task 9 as `in_progress`.

If Task 8 found code issues:

1. **Diagnose**: Identify which files need changes (connector spec, types)
2. **Verify MCP tool names** (if MCP-native): Use the `listTools` action to discover actual tool names and schemas:
   ```bash
   source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh" && kibana_curl -X POST -H "Content-Type: application/json" \
     "$KIBANA_URL/api/actions/connector/<connector_id>/_execute" \
     -d '{"params":{"subAction":"listTools","subActionParams":{}}}'
   ```
3. **Fix**: Use `Edit` to fix the identified issues
4. **Wait for hot-reload**: Wait ~60 seconds for Kibana to hot-reload server-side changes.
5. **Re-test**: Run another chat test using `/chat-with-agent`
6. **Re-verify**: Check tool call quality again

Repeat this loop up to 3 times. If issues persist after 3 iterations, report the remaining problems to the user and move on.

If Task 8 found NO code issues, skip this task entirely.

Mark task 9 as `completed`.

---

## Task 10: Final Code Review

Mark task 10 as `in_progress`.

Do one final review using the **review-connector** skill. Verify no TODOs/placeholders, consistent naming, no debug artifacts. Rerun `node scripts/connector_vendor_api --connector <id> --check` and the vendor API contract test (`node scripts/jest src/platform/packages/shared/kbn-connector-specs/src/connector_spec_vendor_api_contract.test.ts`), as fixes made since Task 1 often leave the artifacts out of date. The review skill will also run docs quality checks (`docs-check-style`, `crosslink-validator`, `frontmatter-audit`, `content-type-checker`, `applies-to-tagging`) on any connector docs. Make any final minor fixes if needed.

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

**If any action has optional modifier params** (`scope`, filters, `all_X` flags, an expiry timestamp)
beyond its required fields, make sure this test (or an earlier one) actually causes the agent to set at
least one of them to a non-default value, not just the required-fields-only happy path. A query-param-vs-
body mismatch on an optional param doesn't error — the vendor silently ignores it — so a test that never
sets the param will pass even though the feature is broken.

Verify the agent successfully calls tools, gets results, and produces a useful response.

Mark task 11 as `completed`.

---

## Task 12: Compile the PR Validation Table

Mark task 12 as `in_progress`.

Read `create-connector/reference/pr-validation-table.md` for the full format and rules, and build the
`## Validated` markdown section now, while the results from Tasks 5-11 are fresh:

- One row per action defined in the connector spec's `actions` map, plus the connectivity `test` handler
  if one exists — no action may be omitted.
- For actions actually exercised (Task 7/11 chat tests, direct calls during Task 5 activation, or manual
  testing along the way), describe the concrete scenario tested and mark `✅ Pass` (noting any bug that
  was found and fixed as part of getting it to pass).
- For actions not exercised — deliberately skipped (e.g. destructive/admin-only), blocked by missing
  test data/credentials, or because live testing (Tasks 4-11) was deferred entirely for this connector —
  mark `⚠️ Not validated — needs manual verification` rather than leaving the row out.
- For any action that failed and remains unresolved, mark `❌ Fail` with a short description.
- Above the table, report the vendor API contract result from Task 10: the sources and API versions
  recorded against, whether the contract test passes, and the overlay actions and `unmatched` entries,
  each with its evidence.

Keep this table's markdown handy (in the task output or scratch notes) — it must be included verbatim
under a `## Validated` heading in the PR description when this connector's PR is opened, whether that
happens later in this same session or by a human afterward. If a PR already exists for this connector,
add or update the `## Validated` section in its description now rather than waiting.

Mark task 12 as `completed`.

---

## Task 13: Report Completion

Mark task 13 as `completed`.

Tell the user something like the below template, listing the actual file paths that were created or modified during the process:

> The **$ARGUMENTS** connector is ready for manual inspection. Here's what was created:
>
> **Files created/modified:**
> - Connector spec: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/...`
> - Documentation: `docs/reference/connectors-kibana/<name>-action-type.md`
>
> **Kibana state:**
> - Connector created with ID: `<id>`
> - Test agent created with ID: `<id>`
> - Test conversations available in Agent Builder
>
> **Next steps:**
> 1. Open Kibana and navigate to the Agent Builder to inspect the agent
> 2. Try chatting with the agent in the Kibana UI
> 3. Review the generated code and adjust as needed
> 4. When satisfied, commit the code changes and open a PR — include the `## Validated` table from Task 12
>    in the PR description, and add the `release_note:feature` and `Feature:Actions/ConnectorTypes` labels

List the actual file paths that were created or modified during the process, and include the `## Validated`
table compiled in Task 12 in your response so the user has it even if they open the PR themselves.

If you open the PR yourself (via `gh pr create`), apply both labels as part of that same command or
immediately after with `gh pr edit <number> --add-label "release_note:feature" --add-label "Feature:Actions/ConnectorTypes"`.
`release_note:feature` surfaces the new connector in the condensed release notes; `Feature:Actions/ConnectorTypes`
routes the PR to the right reviewers and keeps it discoverable alongside other connector-type work. Use these
exact label names/casing — check `gh label list --repo elastic/kibana --search <name>` if unsure they still exist.
