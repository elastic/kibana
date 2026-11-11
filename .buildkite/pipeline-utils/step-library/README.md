# Pipeline Step Library

Buildkite step definitions for Kibana's CI pipelines, written in TypeScript.
This library acts as a one-stop-shop for the steps used to render a dynamic
pipeline, which may contain or omit any number of steps according to the content
of the diff, the target branch, and (for pull requests) any PR metadata.

> [!TIP]
> Porting an existing YAML fragment? See [MIGRATION.md](./MIGRATION.md).

## Writing a step

Steps are written with helper functions that return custom types which extend
Buildkite's own SDK types (`@buildkite/buildkite-sdk`). Generally, prefer using
these helper functions and the custom types; they explicitly require what
Buildkite does not, e.g., a `key`, a `label`, and an `agents` definition.

New steps are written as exported fragments in `steps/<name>.ts`. Group
fragments that belong to one product area in a subfolder named for it, e.g.,
`steps/security_solution/<name>.ts`, rather than prefixing their filenames.
Fragments that share a step, e.g., a build step and the deploy step that reuses
it, are exported from one file (see `steps/cloud.ts`):

```ts
// Individual functions describe the CI intent and produce an array of Steps
// required to express that intent.
export const cpsTests = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/scout/cps_testing.sh',
    label: 'Cross Project Search (CPS) UI Tests',
    key: 'cps-testing',
    agents: spotAgent('n2-standard-8', spotZones.n2),
    depends_on: ['build'],
    timeout_in_minutes: 30,
    retry: retry.agentLossOrAnyOnce,
  }),
];
```

This step would then be wired into the pipeline producer as:

```ts
renderSteps(cpsTests(), { cancelOnGateFailure: true });
```

### Adding a cancelable step to the pull request pipeline

1. Write the step function in `steps/<name>.ts` and export it from `index.ts`.
2. In `scripts/pipelines/pull_request/pipeline.ts`, add an `if` block at the
   position the step should have in the pipeline. It pushes
   `renderSteps(cpsTests(), cancelOnGate)`, where `cancelOnGate` is
   `{ cancelOnGateFailure: true }`. A failing gate step then cancels the step.
   Leave the option off for a step that must run regardless, like
   `postBuildSteps()`.
3. Decide in the `if` when the step runs, from the PR's labels
   (`GITHUB_PR_LABELS`), the target branch, or its changed paths.
   `doAnySuiteRelevantChangesMatch` ignores Scout test files, which share a
   plugin's path prefix; `doAnyChangesMatch` counts them. Include the path of
   the file that defines the step, so that editing it runs it.
4. Add a scenario that selects the step to `pipeline.scenarios.test.ts`, and
   update its snapshot deliberately.

A new step needs no entry in `FRAGMENTS`. That registry holds steps ported from
a YAML fragment, so that their rendered output is compared with the YAML's
snapshot. It is empty now and stays available for the next migration.

General rules and paradigms:

1. Use explicit presets. Pass `spotAgent(...)`, `retry.*`, etc. by name. Steps
   differ on purpose, and those differences should stay visible.
2. Define a new preset only once more than a single step would use it.
3. Exit statuses in `retry` are integers or `*`, as specified by Buildkite's
   schema.
4. `gateStep` automatically marks a step with `CHECK_GATE`. If such a step
   permanently fails, then all steps registered to be canceled-on-gate will
   be canceled.
5. `waitStep` renders `wait: null`; pass `continue_on_failure` if you need it.
6. `genericStep` is the escape hatch for a step that the helpers do not fit,
   e.g., a command step with no `key`. It accepts any step allowed by the
   Buildkite schema. When using it, consider how to fit it into an expressive
   helper. Otherwise, say why it's needed in a comment.

## Rendering

`renderSteps(steps, options)` returns YAML text. The output can be customized
using `options`.

| Option                      | Effect                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| none                        | Produce a continuation chunk. The leading `steps:` line is stripped.                                                 |
| `header: true`              | Produce a standalone document. Keep `steps:`; allow a top-level `env`. Used for the pipeline's first chunk.          |
| `cancelOnGateFailure: true` | Register all command steps' `key`s and groups' child `key`s (but not the groups' own `key`s) to be canceled-on-gate. |

> [!NOTE]
> A command step with no `key` throws when `cancelOnGateFailure` is set. This
> can only happen when building a step using `genericStep`.

## Testing

- `npm run typecheck` in `.buildkite` is the gate for the types and the
  type-level assertions in `types.test.ts`. Jest does not report type errors in
  this workspace.
- Tests resolve paths through `getKibanaDir()` or `__dirname`, never the working
  directory, because CI (`npm test --prefix .buildkite`) and moon (from the repo
  root) run them differently.
- `render.fixtures.test.ts` runs the renderer over any YAML fragment still on
  disk. None remain; it is kept for the next YAML migration.
- `fragments.test.ts` snapshots every fragment in `FRAGMENTS` (from its
  TypeScript function, or from its YAML while it is unported) after a semantic
  normalization. With no fragments registered it has no snapshot file. The
  `sync_pull_request_fragments.sh` quick check registers new `pull_request/*.yml`
  files in `FRAGMENTS` (and drops deleted unported ones with their snapshots),
  regenerates the snapshots of unported fragments and the scenario snapshots,
  and auto-commits. It never rewrites a ported fragment's snapshot.
  `pipeline.scenarios.test.ts` (in `scripts/pipelines/pull_request`) snapshots the
  ordered step ids of the whole pipeline for example PRs. Update a snapshot
  deliberately, never to make a change pass.
- A test that mocks `child_process` cannot call `getKibanaDir()`, which runs
  `git` through it.
