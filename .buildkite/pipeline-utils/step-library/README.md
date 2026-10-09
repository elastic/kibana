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

New steps are written as exported fragments in `steps/<name>.ts`:

```ts
// Individual functions describe the CI intent and produce an array of Steps
// required to express that intent.
export const cpsTests = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/scout/cps_testing.sh',
    label: 'Cross Project Search (CPS) UI Tests',
    key: 'cps-testing',
    agents: spotAgent('n2-standard-8', spotZones.centralFCA),
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
| `header: true`              | Produce a standalone document. Keep the `steps:` line. Used for compatibility with existing YAML fragments.          |
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
- `render.fixtures.test.ts` runs the renderer over every YAML fragment that
  still exists.
- `fragments.test.ts` snapshots every fragment (from its YAML, or from its
  TypeScript function once ported) after a semantic normalization.
  `pipeline.scenarios.test.ts` (in `scripts/pipelines/pull_request`) snapshots the
  ordered step ids of the whole pipeline for example PRs. Update a snapshot
  deliberately, never to make a change pass.
- A test that mocks `child_process` cannot call `getKibanaDir()`, which runs
  `git` through it.
