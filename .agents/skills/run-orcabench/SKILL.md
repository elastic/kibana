---
name: run-orcabench
description: Run the 42-case Nightshift ORCA benchmark manually against a selected model, or check its local run configuration without starting investigations.
---

# Run ORCA manually

Run the ORCA selection of `nightshift-investigations` using the native evals CLI. This is a
local execution workflow; PR CI continues to use `evals:nightshift-investigations` with both
current coverage and ORCA. Adding or editing this skill does not authorize a benchmark run.

Example requests: `$run-orcabench with <model> judged by <judge>` or
`$run-orcabench check configuration only with profile <name>`.

## Resolve the run

Read the suite's [ORCA instructions](../../../x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/README.md#orca-benchmark)
and [release guard](../../../x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/evals/investigation/orca_dataset.ts).
Use their current dataset identity, digest, source configuration and artifact locations.

Resolve these from the request and session context:

- Checkout and commit to evaluate. Run from that checkout's repository root, preserving other
  worktrees and their services. Record uncommitted changes when evaluating a dirty checkout.
- One model connector and a judge connector. Reuse explicitly selected connectors; otherwise
  inspect the existing evals connector configuration and resolve the missing selection with
  the user. An omitted model can run every configured model, so pass `--model` explicitly.
- Profile: use `dev-vault` for the shared Golden dataset and result destination unless another
  configured profile was requested. File profiles need the Golden dataset credentials as well
  as sandbox, telemetry and export settings.
- Execution or configuration check only. A requested run authorizes its selected model and
  judge calls and experiment persistence. Honor any outstanding session hold on paid runs;
  a request to prepare commands or check readiness ends before investigations start.

Default to all 42 cases, one repetition and concurrency eight. Treat a smaller concurrency as
valid when requested; it increases runtime. A filtered or partial run is not a full baseline.

## Prepare the environment

1. Use the Node version in `.nvmrc`. Bootstrap with `node scripts/kbn bootstrap` for a fresh
   checkout, after switching branches, or when dependencies are missing.
2. Check Docker and `jq` are available. The suite starts a serverless observability Scout stack
   and EDOT locally; the sandbox executes remotely. Reserve the local ports and ensure the
   sandbox session pool can support 42 cases plus overlapping runs. Investigation concurrency
   alone does not resize that pool.
3. Use existing credential access. `dev-vault` merges the suite's `nightshift` config over shared
   `golden` config. Read `nightshiftOrcaEs: { url, apiKey }` from the suite config, with the shared
   entry retained as a compatibility fallback. Keep source
   privileges read-only and credentials in Vault or ignored owner-only profile files. Report
   missing fields by name; keep their values out of chat, argv and logs. Credential provisioning,
   Vault writes and source restoration are separate tasks.
4. Start with a fresh ORCA Scout server. When replacing this task's idle stack, use
   `node scripts/evals stop --service scout` first. If an existing stack belongs to another
   active task, resolve the port/service conflict before proceeding. `start --skip-server` and
   a bare `run` do not establish which telemetry connector an existing server loaded.

## Check the configuration

Substitute the resolved connector IDs and profile below; the angle-bracket values are not
literal arguments. Pass a single model ID, one repetition and the requested concurrency.

```bash
NIGHTSHIFT_DATASETS=orcabench node scripts/evals start \
  --suite nightshift-investigations --profile <profile> \
  --model <model-connector-id> --judge <judge-connector-id> \
  --repetitions 1 --concurrency 8 --dry-run
```

This resolves profiles, connectors and the ORCA hook without starting Scout or investigations.
It may require the profile's normal authentication. It does **not** verify the Golden release
or telemetry counts; those guards execute in the actual test before paid investigations.
For a configuration-only request, report this boundary and stop here.

## Execute once

Announce the checkout/commit, model, judge, profile, 42-case coverage and result destination.
Use `umask 077` for logs and evidence. Preserve any previous
`target/nightshift-investigations/<model>/` artifacts in an ignored run directory before
starting, since another invocation with the same model can overwrite those files.

Run the checked command without `--dry-run`. Keep `NIGHTSHIFT_DATASETS=orcabench` and
`--repetitions 1`; use `start` to establish the ORCA server configuration. Observe the process
through completion, saving its exit status and logs. Allow for six batches of investigations
that can each take 30 minutes, plus startup and judging. Keep progress updates during long runs.

The native test validates the pinned Golden payload and all three historical signal counts,
then runs the existing investigation task and five judges. It requires positive telemetry from
the ORCA sandbox connector. A hook flag or a successful query against local Scout Elasticsearch
alone is insufficient evidence that investigations used ORCA.

On failure, preserve the evidence and diagnose the first failing boundary. Do not relaunch the
whole benchmark automatically: failed workflows are still scored, execution checks can fail
after all paid work finishes, and a second launch creates another expensive attempt. Stop on
credential, source or release drift rather than changing pins or selecting another dataset.

## Verify and report

Inspect the experiment and artifacts under `target/nightshift-investigations/<model>/`:

- Account for all 42 unique case IDs, one attempt each, and all 210 scores across the five judges.
  Report any missing cases or scores as incomplete coverage, even if the process exited zero.
- Separate workflow/parser/execution failures from advisory quality scores. Inspect the
  per-case outputs, conversations, trace snapshots and `artifact-errors.json`; retain available
  evidence when an execution assertion fails.
- Record the commit, model, judge, profile name, concurrency, elapsed time, exit status, dataset
  release/digest, experiment ID/link and artifact paths. Report execution success counts and
  quality results separately. Preserve the dataset's attribution when sharing results.
- State whether the run was full, partial or configuration-only. A configuration check or
  discovery listing is not an end-to-end result.

Keep profiles and raw benchmark artifacts out of commits. Shut down services started for this
run when finished unless the user asked to keep them for iteration; use
`node scripts/evals stop` only after confirming those managed services belong to this task.
