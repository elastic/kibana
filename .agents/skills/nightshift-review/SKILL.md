---
name: nightshift-review
description: Review guidance for Nightshift changes. Defines risk tiers by what a change touches and the checks each tier needs, with calibration examples from past reviews.
---

# Nightshift review

Use this when reviewing changes to the Nightshift plugins and packages (investigations, sources, significant events, the sandbox plugin, and the shared Nightshift packages).

## Risk tiers

A change's tier is the highest tier of any file it touches. Risk means how much damage a mistake does, how hard it is to undo, and how quickly someone would notice. It is not the size of the change.

A change that also touches files outside the Nightshift plugins and packages is never Low. Judge those files by their own area, and don't apply these tiers to them.

### High

- **Authorization:** privilege checks, Spaces isolation, who may read or run an agent, service-account identity, and agent ownership or ACLs. In `nightshift_investigations` this includes `server/lib/service_account/**` and the code that installs agents.
- **Sandbox:** isolation, credentials passed into containers, network access, and command execution (`x-pack/platform/plugins/shared/sandbox`).
- **Secrets and credentials.**
- **Prompts and guardrails:** `**/instructions/*.md.text` and the prompts and submission guardrails in `kbn-nightshift-decision-trees`.
- **Outbound messages** to external systems (for example Slack), which cannot be unsent. This includes `significant_events/server/lib/slack_app/**`, `significant_events/server/routes/internal/apps/slack/**`, and in `nightshift_investigations`: `server/lib/notifications/**`, `server/step_definitions/send_notifications.ts`, `server/step_definitions/render_slack_message.ts`, `server/lib/automations/generate_workflow_yaml.ts` and `server/routes/find_or_create_slack_thread_investigation.ts`.
- **Data migrations** and changes to stored data.

### Medium

- Investigation logic, agent tools, API routes, saved object definitions without a migration, and telemetry schemas.
- UI changes, including copy and UI behind a feature flag. A file path can't show that a change is behind a flag.
- Eval judges, scorers and evaluators. They decide what the eval evidence for prompt changes means.
- Any change that skips, focuses or deletes a test, including Scout spellings such as `apiTest.skip` and `apiTest.fixme`.
- Agent instruction files such as `AGENTS.md` and `SKILL.md`.

### Low

- Documentation.
- Tests that add or change cases without skipping, focusing or deleting any, plus mocks and Storybook stories.
- Eval suite data that doesn't change how results are scored, such as datasets and snapshot run IDs, in `kbn-evals-suite-nightshift-*` and `kbn-evals-suite-significant-events`.

## Checks for High changes

1. **Every read and write checks the intended privilege,** including reads made at prompt time, not only API routes.
2. **Know which identity runs the code.** Check hooks and post-execution workflows as well as the main path. They can run as the parent workflow's identity, not the agent's.
3. **Existing installs.** A change to a default (for example making an agent `Shared`) does not update objects that are already installed if the install code returns early when the object exists. Look for a migration or an explicit decision not to support old installs.
4. **No silent fallback to a broader identity or permission.** A fallback needs at least a logged warning.
5. **Prompt changes need evidence.** Expect eval results (for example the `writeup` eval or an ORCA run) or a stated reason none apply. Check that removed instructions and added length are intentional.
6. **Outbound messages:** check for duplicate sends on retry, and that nothing leaks beyond the intended space or channel.
7. **Sandbox:** check that no credential or host path reaches the container unintentionally.

## Checks for Medium changes

Look for correctness bugs, missing error handling at boundaries, and missing tests for new behavior. A skipped or deleted test needs a stated reason and a tracking issue, and a focused test (`.only`) must not merge. Do not apply the High checks unless the change touches one of those areas.

## Checks for Low changes

Low changes get the least human attention, so check them properly. Do not comment on style.

1. **New or changed tests can fail.** They assert on the behavior under test, not on mocks the test set up itself.
2. **Tests don't depend on brittle details,** such as exact error message strings, timing, or an ordering the code doesn't guarantee.
3. **Eval data changes don't change scores or saved output** without the PR saying so.
4. **Docs match the code they describe.**

## Calibration examples

- A prompt-time read with no Nightshift read privilege check is a security gap (reported as P1 in PR 295597).
- Switching an agent's default to `Shared` without updating already-installed private agents leaves existing spaces broken (reported as P2 in PR 299097).
- A Scout test that tells "denied by privilege" apart from other failures only by matching an error message is brittle, even in a test-only PR (raised by a reviewer in PR 296353).
- Adding `apiTest.skip` or `apiTest.fixme` makes a test-only PR Medium, not Low (PRs 297943 and 299161).
