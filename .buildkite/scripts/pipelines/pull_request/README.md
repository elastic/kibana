# Pull Request Pipeline

## Gate failure cancellation

E2E steps (FTR, Scout, Cypress) start as soon as `build` completes. If a gate step (linting, type checks, etc.) fails, registered E2E steps are automatically canceled to minimize cost from running expensive jobs when there are obvious failures.

### How it works

1. **Gate steps** in `base.yml` are tagged with `env: { CHECK_GATE: 'true' }`.
2. **E2E steps** are registered at pipeline upload time by passing `{ cancelOnGateFailure: true }` to `getPipeline()`, or by writing a single batch metadata key (e.g. `cancel_on_gate_failure_batch:<namespace>`) containing a JSON array of step keys.
3. When a gate step fails permanently, `post_command.sh` runs `scripts/steps/gate_failure/cancel.ts`, which reads `cancel_on_gate_failure_batch:*` metadata keys (each containing a JSON array of step keys) and cancels those steps.

### Important: `step cancel` does not work on group keys

`buildkite-agent step cancel` only cancels individual **command** steps. It silently fails on **group** keys (e.g., `ftr-configs`, `scout-configs`). Always register child step keys for cancellation, not the parent group key.

### Adding a new cancelable step

- **Static YAML pipeline**: Add a `key:` to every command step in the YAML file, then pass `{ cancelOnGateFailure: true }` to `getPipeline()`. If a step is a group, `extractStepKeys()` will automatically recurse into its children and register their keys instead. Missing keys on command steps will cause a build-time error.
- **Dynamic step uploader**: Add a `key` to each child step in `bk.uploadSteps()`, then register all child keys in a single batch metadata write:
  ```ts
  bk.setMetadata(
    'cancel_on_gate_failure_batch:<namespace>',
    JSON.stringify(childSteps.map(s => s.key))
  );
  ```
  Do **not** register the group key — it will silently fail to cancel.
