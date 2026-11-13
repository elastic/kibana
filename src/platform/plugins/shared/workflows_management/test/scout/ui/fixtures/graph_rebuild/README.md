# Graph rebuild tests

Scout tests for the workflow visual builder (graph view). Each test takes a workflow YAML and builds it again
through the graph only: triggers, settings, then every step, each added from a wire's "+" and filled in the step
form. The YAML editor is never touched. The workflow is then saved, read back over the API and compared with the
input.

The form is read, not hard-coded per step type: for each value the control `workflowStepConfigField-<path>` is
found on the page, and what kind of control it is (text, JSON, dropdown, switch, number, tags, key/value rows,
ES|QL) decides how it is driven. A value with no control is reported as `unsupported`; it is never written through
the YAML editor.

## Files

| File | What it is |
| --- | --- |
| `workflows/*.yaml` | The workflows that are rebuilt |
| `fixtures.ts` | One entry per workflow: `knownGaps`, `timeoutMs`, `heapBudgetMb`, `connectors` |
| `rebuild_workflow.ts` | `rebuildWorkflowInGraph({ page, pageObjects, apiServices, yaml, name })` for any YAML |
| `compare_rebuilt_workflow.ts` | Compares the saved workflow with the input |
| `expect_rebuild.ts` | `expectRebuildMatches`: fails on a problem that is not a known gap, and on a known gap that did not occur |
| `run_graph_rebuild_fixture.ts` | What a spec calls: connectors, rebuild, assertion, heap budget |
| `../page_objects/workflow_graph_authoring_page.ts` | The page object with the form, insertion, settings and trigger controls |
| `../../parallel_tests/workflow_graph_rebuild/*.spec.ts` | One spec per fixture, so Scout's workers split them |

## What each fixture covers

These are the causes found when the whole example library was rebuilt, one fixture each.

| Fixture | Covers |
| --- | --- |
| `settings_triggers` | Description, tags, constants of every type, manual inputs (required, default, enum, array), scheduled, alert |
| `flow_control` | if/else, foreach with a nested if, while, switch (cases and default), step-level `if` and `timeout` |
| `error_handling` | `on-failure`: continue, retry, fallback steps, a fallback inside a loop |
| `data_transforms` | `data.map` (item, index, nested `$map`), `data.set`, `data.parseJson`, filter, find, aggregate |
| `references_editors` | References picked from the data picker (number and switch fields) or typed (filters, deep paths), ES\|QL, key/value rows, JSON objects, multi-line text, tags, union fields |
| `connectors` | `connector-id` picked by id, inside a loop, and an id no connector has; the connector is created by the spec |
| `long_workflow` | 45 heavy steps built in one page: it must finish, and the page's JS heap after a GC must stay under `heapBudgetMb` (the page used to die at about 40 steps) |

## Adding a case

1. **A new step type or field** goes into the fixture that fits it: append one step that uses every `config` key and
   `with` field once.
2. **A new fixture** when the case needs its own setup (a connector, an index, a setting), or the fixture has about 15
   steps: add `workflows/<name>.yaml`, an entry in `fixtures.ts`, and copy a spec from
   `parallel_tests/workflow_graph_rebuild/` (change `FIXTURE` and the title). Then regenerate the manifest (below).
3. The form writes schema defaults (`order: asc` on `data.aggregate`, `flatten: false` on `data.concat`). Write the
   default in the fixture, so the saved workflow equals it.
4. A fixture uses the current YAML form (`event.inputs.*`, not `inputs.*`).

### Known gaps

When the builder cannot author something, either fix the form or add an entry to the fixture's `knownGaps`:

```ts
{ key: 'members_by_team | with.fields | different', reason: 'A `$map` directive has no form control ...' }
```

The key is `<where> | <what> | <kind>`. `where` is the step path (`a > else > b`, `a > case 0 > b`, `a > fallback > b`),
`kind` is `missing`, `extra`, `different`, `unsupported` or `issue`. A test run attaches `graph-rebuild-result` (every
problem with its expected and built values, a JSON file in the Scout report) so the key and what differs are both
visible. A known gap that no longer occurs fails the test: remove it.

### Connectors

A fixture that has steps with a `connector-id` writes a placeholder (`__SLACK_CONNECTOR_ID__`) and lists the
connector in `connectors` (name, action type, secrets). The runner creates it before the rebuild, puts its id in the
YAML, and deletes it afterwards. Creating a connector does not call out.

## Running

```bash
node scripts/scout start-server --arch stateful --domain classic

# in another terminal, with that server running (run-tests would start a second one):
npx playwright test \
  --config src/platform/plugins/shared/workflows_management/test/scout/ui/parallel.playwright.config.ts \
  --project local --grep @local-stateful-classic \
  src/platform/plugins/shared/workflows_management/test/scout/ui/parallel_tests/workflow_graph_rebuild/flow_control.spec.ts
```

Or let Scout start and stop the servers: `node scripts/scout run-tests --arch stateful --domain classic --testFiles
<spec path>` (`--config` and `--testFiles` cannot be combined).

### Any YAML

To rebuild a workflow that is not a fixture, put a throwaway spec (not committed) next to the others:

```ts
const result = await rebuildWorkflowInGraph({
  page, pageObjects, apiServices, yaml: readFileSync(process.env.REBUILD_YAML!, 'utf8'), name: 'scratch',
});
console.log(JSON.stringify(result, null, 2));
```

`result` has `diffs` (what the saved workflow differs in), `unsupported` (values the form has no control for) and
`issues` (trouble met while building).

## Notes

- The long fixture was measured at 276 MB retained heap and 3 minutes (2026-11-13, local Scout server); the budget
  is 420 MB.
- Control clicks on the graph go straight to the control, without a pointer: in a long workflow most controls are
  outside the part of the canvas that is on screen.
- Code editors take their text as a dispatched paste after `Control+A`; typing a `{{` opens the reference picker and
  `keyboard.insertText` is truncated by the editor.
- The tests are tagged for stateful classic only: the builder is the same UI on every deployment.
