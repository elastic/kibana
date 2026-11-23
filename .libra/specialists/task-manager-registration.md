---
id: task-manager-registration
description: Reviews new or changed Task Manager task type registrations and scheduling for timeout, abort signal, error classification, capacity, and scheduling guideline compliance
apply_to:
  - "x-pack/platform/test/plugin_api_integration/test_suites/task_manager/check_registered_task_types.ts"
can_block: false
---

# Task Manager task registration review

Review background tasks that a pull request registers or schedules with the Task Manager plugin (`@kbn/task-manager-plugin`).

## Scope

- This review is selected when the pull request changes the registered task types assertion, which means a task type was added, renamed, or removed. That file is only the trigger; do not review it beyond checking that the new id is present and the list stays sorted.
- Find the task code itself in the pull request's other changed files: search them for `registerTaskDefinitions`, `createTaskRunner`, `ensureScheduled`, `schedule`, and `bulkSchedule`, and read the full diff of each matching file with `read_file_diff`. Follow the `run()` call chain into the functions it calls, including ones in files the pull request does not change.
- If the pull request only removes a task type, check that the type is handled as a removed type so existing task documents are not left unclaimable, then finish.
- If no task registration or scheduling code can be found, finish without findings.
- Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` or the `backport` label as the available backport signal.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/task-manager-registration/SKILL.md`. Follow its numbered sections and its reviewer checklist as written. Ignore the author checklist formatting; report findings only through Libra's review tools.

The definition shape and defaults live in `x-pack/platform/plugins/shared/task_manager/server/task.ts`, and the retry and failure handling in `x-pack/platform/plugins/shared/task_manager/server/task_running/task_runner.ts`. Consult them when a finding depends on what Task Manager does with a value, an error, or a finished task.

## Review priorities

1. The abort `signal` reaches every Elasticsearch and HTTP call on the `run()` path, and loops over many items check it.
2. `timeout` is set explicitly and matches the workload, including how the work grows with the number of spaces, rules, or documents.
3. Errors thrown from `run()` are classified, so a permanent failure is not retried and a transient one is.
4. `maxAttempts`, `cost`, and `priority` match what the task does; a non-default `cost` or `priority` is justified in the pull request description.
5. Tasks scheduled on plugin start use `ensureScheduled` with a stable id, and scheduling neither blocks nor fails plugin start.
6. A task that returns non-empty `state` defines `stateSchemaByVersion`, and a task that accepts `params` defines `paramsSchema`.

## Reporting

Report only concrete, line-specific findings on the task code. Do not report lint, formatting, or naming nits, and do not report a field left at its default when the default is correct for the task.

- Use Libra's injected severity rubric to determine finding severity.
- Cite the matching skill section (for example `§2 signal`) in each finding's `evidence`.
- Treat operational failures, truncated results, and incomplete tool responses as unresolved verification, never as evidence of absence.
