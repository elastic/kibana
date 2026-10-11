# Migrating a YAML fragment

A guide for porting a `pull_request` YAML fragment to this library. It is
temporary: delete it, together with `render.fixtures.test.ts`, when the last
fragment is ported. For how steps are written once ported, see the
[README](./README.md).

## Port a fragment

1. Write the fragment's step function from its YAML, field for field. Follow
   "Writing a step" in the README for helpers, presets and where it lives. Carry
   the YAML's comments over as `//` comments above the step they describe. Use
   `genericStep` only if no helper fits, and say why in a comment. Export the
   function from `index.ts`, which is what `pipeline.ts` imports.
2. In `pull_request/pipeline.ts`, replace the fragment's `getPipeline` call
   using the table below. Keep the call where it is: the order of the emitted
   steps must not change.
3. Re-point the fragment's own "re-run when my definition changes" regex.
   Entries such as `/^\.buildkite\/pipelines\/pull_request\/<name>\.yml/` in the
   `doAny…ChangesMatch` lists now point at the file that defines the step. Cover
   it with a scenario in `pipeline.scenarios.test.ts` that changes the new path.
   That scenario is the only edit a port may make to the scenario snapshot. Leave
   regexes that point at other pipelines' files alone.
4. In `fragments.ts`, set `steps` on the fragment's entry to the new function.
   `fragments.test.ts` then compares the rendered output with the committed
   snapshot of the YAML, after normalizing exit statuses. Never edit the
   fragment snapshot in a port: a difference means the port changed something.
5. Delete the YAML fragment in the same PR (the registry's guard fails while a
   ported fragment's YAML still exists), and `git grep` for its old path to
   update any remaining reference.
6. Describe the differences from the YAML in the PR description (see below), not
   in code comments.

## `getPipeline` to `renderSteps`

`cancelOnGate` in `pipeline.ts` is `{ cancelOnGateFailure: true }`.

| Call today                                                               | Replace with                                |
| ------------------------------------------------------------------------ | ------------------------------------------- |
| `getPipeline('x.yml', cancelable)` (strips `steps:`, registers the keys) | `renderSteps(xSteps(), cancelOnGate)`       |
| `getPipeline('x.yml', false)` (keeps `steps:`)                           | `renderSteps(xSteps(), { header: true })`   |
| `getPipeline('x.yml')` or `getPipeline('x.yml', {})` (strips `steps:`)   | `renderSteps(xSteps())`                     |

## Permitted differences from the YAML

The rendered output must match the YAML, with one exception: numeric-string
exit statuses such as `'-1'` become integers (`-1`). Buildkite's docs and
published schema specify an integer or `*`, and the schema rejects the string.

Anything else, such as a machine type, spot zone, retry or timeout, must stay as
it is, even where fragments disagree. Normalizing those is a separate change.

Put in the PR description: which fragment was ported, any exit statuses that
changed form, and the labels to use for a real build that exercises the suite.

## Special cases

- **Groups:** `groupStep` requires a `key`. Cancel-on-gate registers the
  children's keys, never the group's own.
- **A step with no `key`:** use `genericStep`. Such a step cannot be registered
  for cancel-on-gate, so its fragment must not be loaded with
  `cancelOnGateFailure`.
- **`wait: ~`:** use `waitStep`, which keeps `wait: null`.
- **A fragment uploaded directly by `pipeline.sh`** (`store_moon_cache.yml`)
  never passes through `pipeline.ts`. Print its rendered document with
  `renderSteps(steps, { header: true })` from a small script, and pipe that into
  `buildkite-agent pipeline upload`.

## Transitional pieces

- `header: true` exists because the remaining YAML fragments are still joined
  into the pipeline as text chunks. It goes away with the last fragment.
- `render.fixtures.test.ts` runs the renderer over every YAML fragment that still
  exists, so it covers less with each port.
- `yamlPath` in `fragments.ts` and the YAML-loading branch and YAML-file guards in
  `fragments.test.ts` serve the fragments that are still YAML. The snapshots stay.
