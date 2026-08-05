---
name: task-manager-registration
description: Register and schedule background tasks with the Kibana Task Manager plugin (`@kbn/task-manager-plugin`). Use when adding or modifying a task type via `taskManager.registerTaskDefinitions`, calling `ensureScheduled` / `schedule` / `bulkSchedule`, implementing `createTaskRunner` / `cancel`, picking `timeout` / `cost` / `priority` / `maxAttempts`, defining `paramsSchema` / `stateSchemaByVersion`, or reviewing PRs that touch any of these.
---

# Task Manager — Task Registration & Scheduling

> Background tasks run inside the Kibana process and share its capacity pool. A misconfigured task can block shutdown, exhaust the pool, retry forever, or duplicate itself on every restart. The defaults are not always the right choice — verify each field below explicitly.

## Overview

A task type is registered in the **setup** lifecycle of a plugin via `taskManager.registerTaskDefinitions({ [type]: definition })`. The definition declares static metadata (`timeout`, `cost`, `priority`, `maxAttempts`, schemas) and a `createTaskRunner` factory that returns `{ run, cancel? }` per task instance.

Tasks are **scheduled** separately, usually on plugin **start**, via `taskManager.ensureScheduled` (recurring/idempotent) or `taskManager.schedule` / `bulkSchedule` (one-shot).

**Source of truth:**
- Definition shape: `x-pack/platform/plugins/shared/task_manager/server/task.ts` (`TaskDefinition`, `RunContext`, `TaskCost`, `TaskPriority`, `InstanceTaskCost`, `DEFAULT_TIMEOUT = '5m'`)
- Error helpers: `x-pack/platform/plugins/shared/task_manager/server/task_running/errors.ts`
- Plugin entry point exports: `@kbn/task-manager-plugin/server`

## Registration anatomy

```ts
taskManager.registerTaskDefinitions({
  'my-plugin:my-task': {
    title: 'My Task',
    description: 'What this task does and why it exists.',
    timeout: '2m',
    maxAttempts: 1,
    cost: TaskCost.Normal,
    priority: TaskPriority.Normal,
    paramsSchema: schema.object({ /* ... */ }),
    stateSchemaByVersion: { 1: { schema: stateSchemaV1, up: (s) => s } },
    createTaskRunner: (context) => {
      const { taskInstance, abortController } = context;
      return {
        run: async () => { /* ... */ },
        cancel: async () => { /* cleanup */ }, // optional, see §3
      };
    },
  },
});
```

Each section below covers one field or concern, the rule, the correct pattern, and the anti-pattern reviewers most commonly flag.

## 1. `timeout` — set it deliberately

**Rule:** `timeout` MUST be set explicitly to a value that reflects the task's expected duration plus a reasonable margin. Do NOT inherit the `'5m'` default unless 5 minutes is genuinely the right ceiling.

- Too small → Task Manager kills in-flight work and retries; the task never completes.
- Too large → A wedged task blocks shutdown and a slot in the capacity pool until the timeout elapses.

The validator only checks the format (`{number}{m|s|h|d}`); it does NOT check that the value is sensible. That is the author's responsibility.

```ts
// Correct: short tasks get short timeouts
{ timeout: '30s' }   // a quick health scan
{ timeout: '2m' }    // a typical batched job
{ timeout: '10m' }   // a heavier ES migration
```

```ts
// Anti-pattern: defaulting / over-sizing
{ /* timeout omitted */ }      // silently '5m'
{ timeout: '1h' }              // for a task that always finishes in seconds
```

## 2. `abortController` — actually use it

**Rule:** `createTaskRunner` MUST destructure `abortController` from `RunContext` and propagate `abortController.signal` to every cancellable operation: ES client calls, `fetch`/HTTP requests, child loops, and any `setTimeout`/`setInterval` based polling.

The `abortController` is **signal-only**: Task Manager signals it on timeout or shutdown but never reads `.signal` itself. The signal is the only channel Task Manager has to ask a task to stop — it is the task code's responsibility to comply by passing it to I/O and checking `signal.aborted` in loops. Ignoring it lets in-flight work run past the timeout, hold ES connections open, and block clean shutdown.

**A task cannot exit by signalling its own controller.** Calling `abortController.abort()` from inside `run()` does nothing useful — Task Manager never reads the signal. To exit early, return from the top-level task function, or throw an error (Task Manager catches it; classify with the helpers in §4).

### Pass the signal to ES clients

```ts
const result = await esClient.search(
  { index, query, size },
  { signal: abortController.signal }
);
```

### Pass the signal to HTTP

```ts
await fetch(url, { signal: abortController.signal });
```

### Bail out of loops

```ts
for (const item of items) {
  if (abortController.signal.aborted) return { state };
  await processItem(item);
}
```

### Or use a `throwIfAborted` helper

```ts
const throwIfAborted = (ac: AbortController) => {
  if (ac.signal.aborted) throw new Error('Task aborted');
};

for (const batch of batches) {
  throwIfAborted(abortController);
  await processBatch(batch, { signal: abortController.signal });
}
```

```ts
// Anti-pattern: ignore the abortController entirely
createTaskRunner: ({ taskInstance }) => ({
  run: async () => {
    for (const id of bigList) {
      await esClient.search({ index, query: { term: { id } } }); // no signal, no abort check
    }
    return { state: {} };
  },
});
```

## 3. `cancel()` — optional cleanup hook

**Rule:** `cancel()` is **optional**, and omitting it is the common case. Add it only when the task holds resources that the abort signal alone does not release: open subscriptions, scheduled timers, file handles, in-memory caches you allocated, or AbortControllers you created downstream.

When present, `cancel()` is invoked by Task Manager **on timeout only** — when a task exceeds its `timeout`, the pool calls `cancel()` (`task_pool/task_pool.ts`). On Kibana shutdown, Task Manager stops the poller but does **not** call `cancel()` on tasks that are still running; rely on the abort signal (and your own cleanup paths) for shutdown. `cancel()` runs **alongside** the abort signal — the signal stops in-flight I/O, `cancel()` releases everything else.

Do **not** add an empty `cancel: async () => {}` just to satisfy the type. If there is nothing to clean up, omit the field entirely.

```ts
createTaskRunner: ({ abortController }) => {
  const subscription = stream$.subscribe(/* ... */);
  return {
    run: async () => { /* ... */ },
    cancel: async () => {
      subscription.unsubscribe();
    },
  };
};
```

## 4. Error classification — `throwUnrecoverableError` vs `throwRetryableError`

**Rule:** Errors thrown from `run()` MUST be classified. Use `throwUnrecoverableError` for permanent failures (no point retrying) and `throwRetryableError` for transient failures (retry, optionally with custom timing). Generic thrown errors are retried up to `maxAttempts` with default backoff, which is rarely what you want for either case.

```ts
import {
  throwUnrecoverableError,
  throwRetryableError,
} from '@kbn/task-manager-plugin/server';

// Permanent — config missing, feature disabled, malformed params
if (!config.endpoint) {
  throwUnrecoverableError(new Error('Required config xpack.myFeature.endpoint not set'));
}

// Transient — try again in 60s
if (esError.statusCode === 503) {
  throwRetryableError(
    new Error('ES temporarily unavailable'),
    new Date(Date.now() + 60_000)
  );
}

// Transient — try again with default backoff
if (lockHeld) {
  throwRetryableError(new Error('Lock held by another instance'), true);
}
```

```ts
// Anti-pattern: throw raw Error for permanent failure
if (!config.endpoint) {
  throw new Error('Required config not set'); // Task will retry maxAttempts times for nothing
}
```

## 5. `paramsSchema` — validate input early

**Rule:** Define `paramsSchema` whenever the task accepts `params`. Validation runs at scheduling time, surfacing bad input at the call site instead of inside `run()`.

```ts
import { schema } from '@kbn/config-schema';

const paramsSchema = schema.object({
  spaceId: schema.string(),
  ruleIds: schema.arrayOf(schema.string(), { minSize: 1 }),
});

taskManager.registerTaskDefinitions({
  'my-plugin:process-rules': {
    paramsSchema,
    createTaskRunner: ({ taskInstance }) => ({
      run: async () => {
        // taskInstance.params is now trusted to match paramsSchema
      },
    }),
  },
});
```

A task with no params (single-instance recurring tasks) does not need `paramsSchema`.

## 6. `stateSchemaByVersion` — required if state persists between runs

**Rule:** Define `stateSchemaByVersion` whenever the task returns non-empty `state` from `run()`. Each version provides a `schema` and an `up` migration from the previous version.

State is persisted on the task SO between runs. Without a schema, any state-shape change is silently invalid until it crashes a future `run()` after upgrade.

```ts
import { schema } from '@kbn/config-schema';

const stateSchemaV1 = schema.object({
  lastRunAt: schema.maybe(schema.string()),
});

const stateSchemaV2 = schema.object({
  lastRunAt: schema.maybe(schema.string()),
  cursor: schema.maybe(schema.string()),
});

stateSchemaByVersion: {
  1: { schema: stateSchemaV1, up: (s) => s },
  2: {
    schema: stateSchemaV2,
    up: (s) => ({ ...s, cursor: (s as { cursor?: string }).cursor }),
  },
}
```

The first run of a task whose state doesn't match the latest schema is migrated forward by chaining `up` functions. `up` MUST be pure and idempotent.

If the task is fully stateless (every run starts from scratch), return `{ state: {} }` from `run()` and omit `stateSchemaByVersion`.

## 7. `maxAttempts` — match it to task semantics

**Rule:** Set `maxAttempts: 1` for tasks that should NOT retry (one-shot triggers, idempotency-sensitive operations, anything where a duplicate run causes harm). Use the global default (omit) only when retry-on-transient-failure is the desired semantic.

```ts
{ maxAttempts: 1 }        // one-shot: send a notification, kick off a migration
{ /* omitted */ }         // recurring task using framework default + retryable errors
```

```ts
// Anti-pattern: one-shot task with default retries
{
  // sends a Slack message; default maxAttempts means a transient failure
  // could deliver the message twice
}
```

## 8. `cost` and `priority` — capacity discipline

**Rule:** Pick `cost` based on the task's actual resource footprint, not its perceived importance. Pick `priority` only when the task should preempt or yield to others; the default (`Normal`) is correct for most tasks.

`TaskCost` values are integers used by the capacity pool: `Tiny = 1`, `Normal = 2`, `ExtraLarge = 10`. Capacity is finite; an over-costed task starves its neighbours, an under-costed task gets starved by them.

| Cost | Assumed memory budget | When to pick |
|---|---|---|
| `TaskCost.Tiny` | < 25 MB | Sub-second, no ES query — heartbeats, gauge reporting, light scheduling |
| `TaskCost.Normal` | < 50 MB | Default. A handful of ES queries, modest CPU |
| `TaskCost.ExtraLarge` | < 250 MB | Heavy aggregations, large bulk reads/writes, long-running scans |

The memory budgets are the assumption capacity planning is built on; if the task's real footprint exceeds the budget for its tier, bump the cost rather than relying on the smaller tier's slot.

| Priority | When to pick |
|---|---|
| `TaskPriority.Normal` | Default — almost always correct |
| `TaskPriority.NormalLongRunning` | Long-running tasks that should not block the regular pool |
| `TaskPriority.Low` | Background bookkeeping that may be deferred under load |

### `TaskCost` vs `InstanceTaskCost`

These are distinct enums for distinct contexts — confusing them is a recurring review finding (see [PR #260373](https://github.com/elastic/kibana/pull/260373)):

- **`TaskCost`** — integer enum (`Tiny = 1`, `Normal = 2`, `ExtraLarge = 10`). Use for the **task type definition's** `cost` field and for the **per-instance `cost` override** in `TaskInstance.cost` *when the value is set in code* against the `TaskInstance` type. This is the value the capacity pool reads.
- **`InstanceTaskCost`** — string enum (`'tiny'`, `'normal'`, `'extralarge'`). Use whenever cost travels through a **schema or saved-object attribute**: task params, persisted state, anything serialized. Convert to `TaskCost` with `getTaskCostFromInstance(...)` before comparing or feeding it back to capacity logic.

```ts
import { TaskCost, InstanceTaskCost, getTaskCostFromInstance } from '@kbn/task-manager-plugin/server';

// Task type registration — integer enum
{ cost: TaskCost.ExtraLarge }

// Task params schema — string enum, because it's serialized
const paramsSchema = schema.object({
  cost: schema.oneOf([
    schema.literal(InstanceTaskCost.Tiny),
    schema.literal(InstanceTaskCost.Normal),
    schema.literal(InstanceTaskCost.ExtraLarge),
  ]),
});

// Reading params back at run time
const numericCost = getTaskCostFromInstance(taskInstance.params.cost);
```

## 9. Scheduling — `ensureScheduled` vs `schedule` vs `bulkSchedule`

**Rule:** Use `ensureScheduled` for recurring tasks created on plugin startup. Use `schedule` / `bulkSchedule` for one-shot or user-triggered tasks. Misusing `schedule` on startup creates a duplicate task on every Kibana restart.

| API | Idempotent? | Use case |
|---|---|---|
| `ensureScheduled` | Yes — won't create a duplicate if a task with that `id` exists | Recurring system tasks created during plugin start |
| `schedule` | No — always creates a new instance | One-shot user-triggered work |
| `bulkSchedule` | No — same as `schedule` for many | Bulk one-shot work |

`ensureScheduled` is **not** a pure no-op: if a task with the given `id` already exists and the call supplies an interval-based `schedule`, it updates the existing task's schedule to match (`task_scheduling.ts`). Pass an `interval` only when you genuinely want to override whatever schedule is on disk; otherwise fetch the existing task first (see "Preserving user-configured schedules" below) and reuse its `schedule`.

```ts
// Correct: recurring task on plugin start
public start(core, plugins) {
  void plugins.taskManager.ensureScheduled({
    id: 'my-plugin:my-task',                 // stable, well-known id
    taskType: 'my-plugin:my-task',
    schedule: { interval: '5m' },
    params: {},
    state: {},
  });
}
```

```ts
// Correct: one-shot triggered by user action
await taskManager.schedule({
  taskType: 'my-plugin:export',
  params: { exportId },
  state: {},
});
```

```ts
// Anti-pattern: schedule a recurring task on startup → duplicates on every restart
public start(core, plugins) {
  void plugins.taskManager.schedule({         // ❌ should be ensureScheduled
    taskType: 'my-plugin:my-task',
    schedule: { interval: '5m' },
    params: {},
    state: {},
  });
}
```

### Preserving user-configured schedules

When the user (or the previous run) may have changed the schedule, fetch the existing task before scheduling and preserve its `schedule`/`params`/`state`. `synthetics/server/tasks/sync_private_locations_monitors_task.ts` is the canonical example.

```ts
const existing = await taskManager.get(taskId).catch(() => undefined);
await taskManager.ensureScheduled({
  id: taskId,
  taskType,
  schedule: existing?.schedule ?? { interval: '10m' },
  params: existing?.params ?? {},
  state: existing?.state ?? {},
});
```

### Initialise `state` to a value that matches the schema

Even on first scheduling, the empty `state` you pass MUST be valid input to `stateSchemaByVersion[1].schema`. Schedule with `state: {}` only when the v1 schema accepts an empty object.

## 10. CI gate — update the registered task types assertion

**Rule:** Adding a new task type breaks the FTR test at `x-pack/platform/test/plugin_api_integration/test_suites/task_manager/check_registered_task_types.ts` by design. Add the new task type id to the assertion array in the same PR.

The assertion is a hard-coded sorted list of every registered task type, not a snapshot — there is no `-u` / `--updateSnapshot` flag. Edit the array by hand and keep it sorted. The test's existing comment captures the intent: the failure exists to force Response Ops review when the set of registered task types changes.

## Quick rule reference

| Field / API | Rule | Default if omitted | When wrong |
|---|---|---|---|
| `timeout` | Set explicitly to expected duration + margin | `'5m'` | Times out healthy work, or holds slot for an hour after a wedge |
| `abortController` | Pass `.signal` to ES, HTTP, loops; check in tight loops | n/a | Task runs past timeout; blocks shutdown |
| `cancel()` | Implement when the task allocates resources beyond `signal`'s reach | none | Resource leak on cancel |
| `throwUnrecoverableError` | For permanent failures | n/a | Useless retries on permanent failures |
| `throwRetryableError` | For transient failures | n/a | Task dies on the first transient blip |
| `paramsSchema` | Define when task accepts params | none | Bad params surface mid-run instead of at schedule |
| `stateSchemaByVersion` | Define when state is non-empty between runs | none | Silent state-shape drift after upgrade |
| `maxAttempts` | `1` for one-shot; default for retryable recurring | global default | Duplicate side-effects on transient failures |
| `cost` | Match real resource use; `Normal` default | `TaskCost.Normal` | Pool starvation either way |
| `priority` | `Normal` unless preemption needed | `TaskPriority.Normal` | Long-running task blocks the regular pool |
| `ensureScheduled` | Recurring + startup | n/a | Use of `schedule` here duplicates on every restart |

## Author checklist

When registering a new task type:

1. **Definition fields**
   - [ ] `title` and `description` are filled and informative
   - [ ] `timeout` is set explicitly to a value matched to the workload
   - [ ] `cost` is set, and reflects actual resource footprint
   - [ ] `priority` is set only if the default is wrong
   - [ ] `maxAttempts: 1` if the task must not retry; default otherwise
   - [ ] `paramsSchema` exists if `params` is non-empty
   - [ ] `stateSchemaByVersion` exists if `run()` returns non-empty `state`

2. **Runner**
   - [ ] `createTaskRunner` destructures `abortController` from `RunContext`
   - [ ] `abortController.signal` is passed to every ES client call
   - [ ] `abortController.signal` is passed to every `fetch`/HTTP call
   - [ ] Tight loops check `abortController.signal.aborted` (or a `throwIfAborted` helper)
   - [ ] `cancel()` is implemented if the task allocates resources outside the signal's reach

3. **Errors**
   - [ ] Permanent failures use `throwUnrecoverableError`
   - [ ] Transient failures use `throwRetryableError`
   - [ ] No raw `throw new Error(...)` for classifiable failures

4. **Cost type discipline**
   - [ ] `TaskCost` is used for `definition.cost` and in-code `TaskInstance.cost`
   - [ ] `InstanceTaskCost` is used in any persisted/serialised cost field
   - [ ] `getTaskCostFromInstance(...)` converts before comparing to `TaskCost`

5. **Scheduling**
   - [ ] Recurring tasks scheduled on plugin start use `ensureScheduled` with a stable `id`
   - [ ] One-shot tasks use `schedule` / `bulkSchedule`
   - [ ] If schedule may be user-configurable, the existing task is read first and its schedule preserved
   - [ ] Initial `state` matches `stateSchemaByVersion[1].schema`

6. **CI gate**
   - [ ] New task type id added (in sorted order) to the assertion in `x-pack/platform/test/plugin_api_integration/test_suites/task_manager/check_registered_task_types.ts` — the test fails by design until you do

## Reviewer checklist

When reviewing a PR that adds or modifies a task:

- [ ] Each definition field listed above is set deliberately, not by default
- [ ] `abortController.signal` is propagated through the entire `run()` call chain — search the diff for new ES/HTTP calls without `signal:` and reject
- [ ] Errors are classified — search the diff for `throw new Error` inside `run()` and challenge each one
- [ ] If `cost` or `priority` differs from `Normal`, the PR description justifies the choice
- [ ] If `stateSchemaByVersion` is added or modified, `up` migrations are pure and idempotent and cover every shape change
- [ ] `schedule` is not used in plugin startup code — `ensureScheduled` instead
- [ ] If the task is one-shot, `maxAttempts: 1` is set
- [ ] Tests cover the cancel/timeout path (signal-aborted run returns gracefully)

## Reference implementations

| Plugin | File | Notable pattern |
|---|---|---|
| Fleet | `x-pack/platform/plugins/shared/fleet/server/tasks/automatic_agent_upgrade_task.ts` | `abortController` threaded through call chain with a `throwIfAborted` helper in loops |
| Entity Store | `x-pack/solutions/security/plugins/entity_store/server/tasks/entity_maintainers/index.ts` | Abort signal listener; passes `abortController` through downstream services |
| Alerting | `x-pack/platform/plugins/shared/alerting/server/provisioning/uiam_api_key_provisioning_task.ts` | `stateSchemaByVersion`; telemetry on success/failure |
| SLO | `x-pack/solutions/observability/plugins/slo/server/services/tasks/health_scan_task/health_scan_task.ts` | `maxAttempts: 1`; config-gated execution; typed `RunContext` |
| Synthetics | `x-pack/solutions/observability/plugins/synthetics/server/tasks/sync_private_locations_monitors_task.ts` | Preserves existing schedule in `ensureScheduled`; dynamic schedule from task result |

## Source references

- Task definition schema, `TaskCost`, `TaskPriority`, `InstanceTaskCost`, `RunContext`, `DEFAULT_TIMEOUT`: `x-pack/platform/plugins/shared/task_manager/server/task.ts`
- Error helpers (`throwUnrecoverableError`, `throwRetryableError`, `createRetryableError`): `x-pack/platform/plugins/shared/task_manager/server/task_running/errors.ts`
- Plugin public exports: `x-pack/platform/plugins/shared/task_manager/server/index.ts`
- Monitoring guide: `x-pack/platform/plugins/shared/task_manager/server/MONITORING.md`
- `InstanceTaskCost` introduction context: [PR #260373](https://github.com/elastic/kibana/pull/260373)
