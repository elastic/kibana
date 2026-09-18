---
name: run-micro-evals
description: Run the three Nightshift micro-evals locally and return experiment links and Passing Rule verdicts.
disable-model-invocation: true
---

# Run Micro Evals

Run from the Kibana repository root. The suite evaluates MonitorIdExtraction, PlanExtraction,
and PlanMerge together through the standard eval runner. Passing Rules are report-only.

## 1. Resolve the results profile

Honor an explicit `--profile`. Otherwise inspect
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.<profile>.json` files,
excluding `config.example.json`. Parse them locally and list only profile names and whether
`evaluationsKbn.url` and `evaluationsKbn.apiKey` are configured. Use the sole configured
results profile; if several qualify, ask which one to use.

Accept credentials only through an existing profile or a user-supplied path to a local
credentials file. Never accept inline API keys, print credential values, or commit profiles.
The credentials file must already have the profile shape shown in
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.example.json`.
Install it as `config.<profile>.json` with mode `0600` after checking the destination is
ignored by Git. Ask before replacing a different existing profile.

If neither a profile nor a credentials file is available, ask for the results Kibana URL
and a **path to a file** containing an API key with the golden-cluster eval dataset-read,
owned-dataset-write, and score-ingest/read privileges. Have the user prepare the profile
locally using `node scripts/evals init` and provide its path. Keep credential entry out of
chat and tool output. Proceed when a configured, gitignored profile exists.

## 2. Resolve connectors

Honor explicit `--model` and `--judge`. If the profile has an OpenRouter block with a configured
API key, use `openrouter-anthropic-claude-sonnet-4-6` as the default model. In a Bash session
using the Node version pinned in `.nvmrc`, load the existing connector/profile helper:

```bash
source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh \
  x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.<profile>.json
```

This exports the connector payload and profile judge without printing secrets. Keep this
environment for the eval command; never echo the payload or dump the environment.
The suite also requires `NIGHTSHIFT_PLAN_EXTRACTION_SPLIT` from private runtime configuration;
keep its value out of public commands, logs, and PR evidence.
Limit the generated OpenRouter payload to the selected model(s) and judge using the existing
`generate_openrouter_connectors.js --models <model-ids>` command, capturing its base64 stdout
directly into `KIBANA_TESTING_AI_CONNECTORS`. It reads credentials from the loaded environment
and automatically includes an OpenRouter judge from `EVAL_CONNECTOR_ID`. The full catalog
can exceed Java's environment-string size limit. For an EIS judge, include its definition
from the standard `node scripts/evals init` discovery/cache as well; an OpenRouter-only
payload cannot define an EIS connector.
For an EIS judge, the standard runner enables Cloud Connected Mode using the existing
Elastic credentials/cache. If authentication requires user input, ask them to complete
`node scripts/evals init` locally. Otherwise use
`node scripts/evals init` to configure a supported model connector. Capture initializer output
privately too: it can print connector payloads. Keep the profile's default
judge unless the caller supplied `--judge`. Report connector IDs, never secrets.

## 3. Run the complete suite

Capture the runner's stdout and stderr in an owner-only temporary log. Its startup command
can contain tracing credentials, and task errors can contain source examples. Never stream
or print the raw log. Read only the experiment URLs, rule lines, final verdicts, and sanitized
errors needed to diagnose a failure; redact credential values using the local profile before
showing any other excerpt.

```bash
micro_eval_log="$(mktemp)"
node scripts/evals start --suite nightshift-micro-evals --profile <profile> --model <connector> \
  >"$micro_eval_log" 2>&1
```

Use `node scripts/evals run` with the same suite/profile/model when the caller says the
stack is already running. Pass through `--profile`, `--model`, `--judge`, and `--skip-server`
(`--skip-server` belongs on `start`). Run all three tasks; add no task or example subset filter.
Wait for the runner to finish. If it fails, explain the error; correct configuration problems
and resume the same suite. Keep scores from distinct attempts separate.

## 4. Present the results

Return one row per task containing its permanent `KBN_EXPERIMENT_URL`, every Passing Rule's
line (including MISSING), and its `MICRO_EVAL_RESULT`. Include the selected model and judge.
Distinguish a completed report-only run with failed rules from an infrastructure failure.
Completion requires all three experiments and their summaries; identify any missing result.

See [the suite README](../../../x-pack/platform/packages/shared/kbn-evals-suite-nightshift-micro-evals/README.md)
for the runner parity contract and synthetic example schemas.
