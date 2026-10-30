---
name: nightshift-review
description: Review guidance for Nightshift changes. Defines risk tiers by what a change touches and the checks each tier needs, with calibration examples from past reviews.
---

# Nightshift review

Use this when reviewing changes to the Nightshift plugins and packages (investigations, sources, significant events, the sandbox plugin, and the shared Nightshift packages).

## Risk tiers

A change's tier is the highest tier of any file it touches. Risk means how much damage a mistake does, how hard it is to undo, and how quickly someone would notice. It is not the size of the change.

### High

- **Authorization:** privilege checks, Spaces isolation, who may read or run an agent, service-account identity, and agent ownership or ACLs. In `nightshift_investigations` this includes `server/lib/service_account/**` and the code that installs agents.
- **Sandbox:** isolation, credentials passed into containers, network access, and command execution (`x-pack/platform/plugins/shared/sandbox`).
- **Secrets and credentials.**
- **Prompts and guardrails:** `**/instructions/*.md.text` and the prompts and submission guardrails in `kbn-nightshift-decision-trees`.
- **Outbound messages** to external systems (for example Slack), which cannot be unsent. This includes `significant_events/server/lib/slack_app/**`, `significant_events/server/routes/internal/apps/slack/**`, and in `nightshift_investigations`: `server/lib/notifications/**`, `server/step_definitions/send_notifications.ts`, `server/step_definitions/render_slack_message.ts`, `server/lib/automations/generate_workflow_yaml.ts` and `server/routes/find_or_create_slack_thread_investigation.ts`.
- **Data migrations** and changes to stored data.

### Medium

Investigation logic, agent tools, API routes, saved object definitions without a migration, and telemetry schemas.

### Low

Documentation, copy, additive UI behind a flag, tests, and dev-only evals (`kbn-evals-suite-nightshift-*`).

## Checks for High changes

1. **Every read and write checks the intended privilege,** including reads made at prompt time, not only API routes.
2. **Know which identity runs the code.** Check hooks and post-execution workflows as well as the main path. They can run as the parent workflow's identity, not the agent's.
3. **Existing installs.** A change to a default (for example making an agent `Shared`) does not update objects that are already installed if the install code returns early when the object exists. Look for a migration or an explicit decision not to support old installs.
4. **No silent fallback to a broader identity or permission.** A fallback needs at least a logged warning.
5. **Prompt changes need evidence.** Expect eval results (for example the `writeup` eval or an ORCA run) or a stated reason none apply. Check that removed instructions and added length are intentional.
6. **Outbound messages:** check for duplicate sends on retry, and that nothing leaks beyond the intended space or channel.
7. **Sandbox:** check that no credential or host path reaches the container unintentionally.

## Checks for Medium changes

Look for correctness bugs, missing error handling at boundaries, and missing tests for new behavior. Do not apply the High checks unless the change touches one of those areas.

## Checks for Low changes

Report only clear defects. Do not comment on style.

## Calibration examples

- A prompt-time read with no Nightshift read privilege check is a security gap (reported as P1 in PR 295597).
- Switching an agent's default to `Shared` without updating already-installed private agents leaves existing spaces broken (reported as P2 in PR 299097).
