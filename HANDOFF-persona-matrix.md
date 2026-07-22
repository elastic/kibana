# Handoff: Security Persona Matrix Eval Suite

## What Exists

A new eval suite under `x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/` containing **21 real security prompts** extracted from Dhru's persona evaluations. It runs against a live Kibana stack via EIS connectors, produces score docs in ES, and generates Dhru-style HTML reports.

### Committed Package
```
x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/
├── src/
│   ├── index.ts                    — suite entry + evaluators
│   ├── chat_client.ts              — converse API wrapper with attachment support
│   ├── evaluate_dataset.ts         — runs all 21 examples against the model
│   ├── evaluate.ts                 — Playwright harness
│   ├── evaluators/
│   │   ├── index.ts                — evaluator exports
│   │   └── (criteria/relevance/sequence_accuracy used via kbn-evals-extensions)
│   └── datasets/
│       └── persona_matrix_prompts.ts — all 21 self-contained prompts
├── scripts/                        # HTML report generators + Dhru assets
│   ├── generate_reports.py         — persona matrix + token usage + index
│   ├── generate_ad_report.py       — self-contained AD report (dark mode)
│   ├── dhru_persona.css            — Dhru's original stylesheet
│   ├── dhru_persona.js             — Dhru's original script
│   └── GAP_ANALYSIS.md             — documented remaining work
├── playwright.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

### TypeScript Verification
- **Typecheck**: 0 errors (`tsc exited with 0`, verified on Node 24.18.0)
- **ESLint**: 0 errors, 0 warnings

### Monorepo Integration
- `classic.stateful.config.ts` — ES disk watermark overrides
- `.buildkite/pipelines/evals/evals.suites.json` — suite registered for CI
- `package.json`, `tsconfig.base.json`, `yarn.lock` — package wired in

## How to Run

### Prerequisites
```bash
cd ~/Projects/kibana.worktrees/weekly-evals-matrix
source ~/.nvm/nvm.sh && nvm use 24.18.0
yarn kbn bootstrap  # if deps changed
```

### Full stack boot + eval
```bash
# EIS connectors must be available
cat ~/.elastic/eis-connectors-cache.json | jq -c '.connectors' | base64 > /tmp/eis-connectors.b64

export TEST_ES_PORT=9222
export TEST_KIBANA_PORT=5622
export KIBANA_TESTING_AI_CONNECTORS=$(cat /tmp/eis-connectors.b64)
export EVALUATION_CONNECTOR_ID=eis-anthropic-claude-5-sonnet

node scripts/evals.js start \
  --suite security-persona-matrix \
  --profile persona \
  --model eis-anthropic-claude-4-5-haiku
```

### Skip server (stack already running)
Add `--skip-server` flag after initial boot.

### Report generation (after eval completes)
```bash
cd .eval-artifacts/persona-matrix-run
python3 generate_reports.py          # persona + agent_eval + token + index
python3 generate_ad_report.py        # attack discovery (separate suite)
```

Reports land in `.eval-artifacts/persona-matrix-run/`:
- `index.html` — landing page with 4 report cards + provenance
- `agent_eval_full.html` — per-prompt responses + step traces
- `llm_persona_matrix.html` — role picker + workflow chooser + full matrix + OSS + legend + methodology + provenance
- `token_usage_overview_matrix.html` — dark-mode per-category tables + provenance
- `attack_discovery_results.html` — dark-mode summary + per-model detail cards + provenance

## Results So Far (Haiku judged by Sonnet)

| Category | Score |
|---|---|
| Overall | 8.6/10 |
| Alert Analysis | 9.2 |
| Entity Analytics | 10.0 |
| Threat Hunting | 10.0 |
| Detection Rules | 8.3 |
| Workflow Authoring | 9.2 |
| Triggering Workflows | 6.7 |
| Multi-Step Execution | 6.7 |

- **21/21** persona prompts evaluated
- **5/5** AD scenarios evaluated (2 insights returned)
- **Skill Invoked = 0** → routing gap (model not invoking security-ai-assistant skill)
- **Trace-based evaluators** work (tokens, latency, tool calls all return real values)
- **Cached Tokens** evaluator fails — missing column `cache_read.input_tokens`

## Known Issues (Unchanged — Functional Behavior, Not Report Parity)

1. **Skill Invoked = 0.000** across all examples
   - The model answers correctly but doesn't route through the `security-ai-assistant` skill
   - This is an Agent Builder routing gap, not a prompt issue
   - Need to check: skill registration, `allow_lists.ts`, natural routing via tool descriptions

2. **Cached Tokens evaluator broken**
   - ES|QL column `attributes.gen_ai.usage.cache_read.input_tokens` doesn't exist
   - Harmless — just returns N/A

3. **Relevance / Factuality / Sequence Accuracy evaluators return "unavailable"**
   - These need a judge-model connector configured in the evaluators
   - Currently stubs — need wiring to `EVALUATION_CONNECTOR_ID`

4. **Attack Discovery: 3/5 scenarios return empty insights**
   - Model doesn't find attack patterns in some anonymized alert sets
   - Could need: richer alert snapshots (GCS restore), stronger model (Sonnet/Opus), or different alert selection

5. **Persona matrix scores wiped between Scout restarts**
   - Scout cleans `.evaluation-scores*` indices on boot
   - Solution: the report pipeline caches scores to `.eval-artifacts/` after generation
   - Always regenerate reports immediately after eval completes

## What's Left (Post-Report-Parity)

All report-structure gaps are closed. Remaining work is **functional**, not visual/structural:

| # | Task | Priority |
|---|---|---|
| 1 | **Run Sonnet + Opus + GPT + Gemini** — populate multi-model matrix rows | High |
| 2 | **Fix Skill Invoked routing** — diagnose why skill=0 | High |
| 3 | **Wire judge-model evaluators** — relevance, factuality, sequence accuracy | Medium |
| 4 | **Attack Discovery with richer alerts** — GCS snapshot restore for realistic alerts | Medium |
| 5 | **Automatic Migration eval** — fills C6 column (currently N/A in matrix) | Low |
| 6 | **Run weekly matrix against golden cluster** — compare with CI results | Low |

## Report Generator Gaps — CLOSED ✅

All closed 2026-07-22:
- ✅ Workflow chooser section ("Or choose by workflow")
- ✅ Open-source models self-deployable section
- ✅ "Legend & notes" embedded in methodology
- ✅ CI provenance footer (commit_sha, branch, build_url)
- ✅ Attack Discovery self-contained report (no external dependency)
- ✅ Consistent dark-mode styling across all reports
- ✅ CSS injection fix (no more duplicate HTML body fragments)

## File Locations

```
~/Projects/kibana.worktrees/weekly-evals-matrix/
├── x-pack/solutions/security/packages/kbn-evals-suite-security-persona-matrix/  # TRACKED, all committed
│   └── scripts/                                # Python report generators + Dhru assets
├── src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_tracing/stateful/classic.stateful.config.ts
├── .buildkite/pipelines/evals/evals.suites.json
├── .eval-artifacts/persona-matrix-run/         # gitignored output (HTML + cached JSONL)
│   ├── generate_reports.py                     # working copy (sync to scripts/)
│   ├── generate_ad_report.py                   # working copy (sync to scripts/)
│   ├── dhru_persona.css
│   ├── dhru_persona.js
│   └── *.html (generated)
└── /tmp/start-scout-persona.sh                 # optional startup script
```

## Quick Reference

| Var / File | Purpose |
|---|---|
| `TEST_ES_PORT=9222` | Avoid collision with main dev-cell on :9220 |
| `TEST_KIBANA_PORT=5622` | Avoid collision with main Kibana on :5620 |
| `KIBANA_TESTING_AI_CONNECTORS` | Base64 of `.connectors` dict from `~/.elastic/eis-connectors-cache.json` |
| `EVALUATION_CONNECTOR_ID` | Judge model — must be equal-or-stronger than test model |
| Golden cluster ES | `https://kbn-evals-serverless-ed035a.es.us-central1.gcp.elastic.cloud` |
| Golden cluster traces | `.traces-*` index with 588 spans/trace |
| Local ES scores | `.evaluation-scores*` on `localhost:9222` |
| Scout config | `.scout/servers/persona.json` (ports 9222/5622) |
