# memory-evals

External evaluation runners for Agent Builder memory benchmarks
(LongMemEval, LoCoMo, MemoryAgentBench, Mem2ActBench, MemGround). These
scripts call Kibana's Agent Builder HTTP APIs and live entirely outside the
Kibana product code.

> 📖 **Looking for step-by-step instructions?** Start with the
> [docs/](docs/) folder — there's a guide per eval, a setup checklist, an
> output-format reference, and a troubleshooting page.
>
> - [docs/README.md](docs/README.md) — index
> - [docs/setup.md](docs/setup.md) — one-time setup
> - [docs/longmemeval.md](docs/longmemeval.md)
> - [docs/locomo.md](docs/locomo.md)
> - [docs/memoryagentbench.md](docs/memoryagentbench.md)
> - [docs/mem2act.md](docs/mem2act.md)
> - [docs/memground.md](docs/memground.md)
> - [docs/results.md](docs/results.md) — output schema and scoring math
> - [docs/troubleshooting.md](docs/troubleshooting.md)

## Status

| Benchmark | Runner | Notes |
| --- | --- | --- |
| LongMemEval (S/M/Oracle) | `longmemeval/` | Per-question per-session ingest, optional LLM-as-judge. |
| LoCoMo (10-sample) | `locomo/` | Per-sample shared history, dialogue mapped speaker_a→user / speaker_b→assistant. |
| MemoryAgentBench (AR/TTL/LRU/CR) | `memoryagentbench/` | Permissive loader (turns or documents), per-task judge prompts. |
| Mem2ActBench | `mem2act/` | Tool-call scoring via `steps[].tool_call`, optional `_bulk_create_mcp` registration. |
| MemGround | `memground/` | Scenario state machine (user/assistant/session_break/probe), per-probe scoring (`judge`/`exact`/`tool_call`). |

The package is self-contained: it has its own `package.json`, `tsconfig`, and
`.eslintrc.cjs`, and is not part of the Kibana yarn workspace. Run `npm install`
(not `yarn`) from this directory.

## Layout

```
memory-evals/
  package.json           # npm workspaces: _shared, longmemeval, locomo
  tsconfig.base.json     # shared TS compiler config
  .eslintrc.cjs          # standalone eslint
  _shared/               # @memory-evals/shared lib (kibana_client, dataset, judge, mem2act_score, ...)
  longmemeval/           # LongMemEval runner
  locomo/                # LoCoMo runner
  memoryagentbench/      # MemoryAgentBench runner (AR / TTL / LRU / CR)
  mem2act/               # Mem2ActBench runner (tool-call scorer)
  memground/             # MemGround runner (scenario state machine)
```

`node_modules/`, `results/`, and dataset files under `data/*.json` are
gitignored.

## Prerequisites

- Node.js >= 20 (Kibana's own runtime is v24; both work here).
- A running Kibana with the Agent Builder + memory APIs of [Plan 025](../plans/025_agent_builder_eval_harness_integration.md):
  - `POST /internal/agent_builder/conversations/_import`
  - `POST /internal/agent_builder/conversations/_bulk_delete`
  - `POST /api/agent_builder/converse` with `persist: false` support
- A Kibana user / API key with `agentBuilder:write`.
- Dataset files (not committed):
  - LongMemEval: `tmp/longmemeval_s.json` (or `_m.json`, `_oracle.json`) — download from the [official repo](https://github.com/xiaowu0162/LongMemEval).
  - LoCoMo: `tmp/locomo10.json` — from the [official repo](https://github.com/snap-research/locomo).
  - MemoryAgentBench: any JSON file matching the loader shape (see `memoryagentbench/README.md`).
  - Mem2ActBench: any JSON file matching the loader shape (see `mem2act/README.md`).
  - MemGround: any JSON file matching the loader shape (see `memground/README.md`).
- (Optional) An Anthropic or OpenAI API key for LLM-as-judge scoring.

## Quick start

```sh
cd memory-evals
npm install

# point at a local Kibana
export KBN_URL=http://localhost:5601
export KBN_API_KEY=<base64 api key>
# or: export KBN_USERNAME=elastic; export KBN_PASSWORD=changeme

# (optional) LLM-as-judge
export ANTHROPIC_API_KEY=sk-ant-...
export KBN_JUDGE=auto   # uses anthropic if key set, otherwise records predictions only

# dry-run (no Kibana calls, just dataset loading + pairing)
# (paths are relative to the per-package working directory: memory-evals/<pkg>/)
npm run longmemeval       -- --dataset ../../tmp/longmemeval_s.json --questions 5 --dry-run
npm run locomo            -- --dataset ../../tmp/locomo10.json    --samples 1 --questions 5 --dry-run
npm run memoryagentbench  -- --dataset ../memoryagentbench/data/mab_sample.json --dry-run
npm run mem2act           -- --dataset ../mem2act/data/mem2act_sample.json --dry-run
npm run memground         -- --dataset ../memground/data/scenarios_sample.json --dry-run

# full run
npm run longmemeval       -- --dataset ../../tmp/longmemeval_s.json --questions 50 --run-id baseline
npm run locomo            -- --dataset ../../tmp/locomo10.json    --samples 1 --run-id baseline
npm run memoryagentbench  -- --dataset ../memoryagentbench/data/mab_sample.json --run-id baseline
npm run mem2act           -- --dataset ../mem2act/data/mem2act_sample.json --register-tools --run-id baseline
npm run memground         -- --dataset ../memground/data/scenarios_sample.json --run-id baseline
```

Results land in `memory-evals/<eval>/results/<run-id>/`:

```
results/<run-id>/
  state.json     # checkpoint (resume by re-running with the same --run-id)
  results.json   # final accuracy + per-question records (LongMemEval shape)
  summary.md     # human-readable summary
  raw/<question_id>.json   # raw predicted/steps/judge dump per question
```

## Environment variables

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `KBN_URL` | yes | — | Base URL of the Kibana instance. |
| `KBN_API_KEY` | one of | — | Encoded API key (preferred). |
| `KBN_USERNAME` / `KBN_PASSWORD` | one of | — | Basic auth fallback. |
| `KBN_BASE_PATH` | no | auto | Override base path; otherwise detected via `GET /`. |
| `KBN_SPACE` | no | `default` | Forwarded as `x-kbn-space` for space-scoped APIs. |
| `KBN_AGENT_ID` | no | `default` | Agent used for ingest + converse. |
| `KBN_CONNECTOR_ID` | no | — | Optional connector override on converse. |
| `KBN_MCP_CONNECTOR_ID` | no | — | MCP Stack connector id used by `mem2act --register-tools`. |
| `KBN_MEMORY_EXTRACT_URL` | no | — | If set, the runner POSTs `{ conversation_id, user_id?, agent_id?, started_at? }` after each import. No-op otherwise. |
| `KBN_JUDGE` | no | `auto` | One of `anthropic`, `openai`, `none`, `auto`. |
| `KBN_JUDGE_MODEL` | no | provider default | Override judge model id. |
| `ANTHROPIC_API_KEY` | judge | — | When `KBN_JUDGE` resolves to anthropic. |
| `OPENAI_API_KEY` | judge | — | When `KBN_JUDGE` resolves to openai. |

## Memory extract contract (for the memory team)

When `KBN_MEMORY_EXTRACT_URL` is set, the runner POSTs (after each import):

```http
POST <KBN_MEMORY_EXTRACT_URL>
Content-Type: application/json
Authorization: <same auth as KBN_URL>
kbn-xsrf: report-it

{
  "conversation_id": "uuid",
  "agent_id": "default",
  "started_at": "2023-05-20T02:21:00.000Z"
}
```

A 2xx is treated as success; any 4xx/5xx fails the question with a descriptive
error. The runner waits for the response before issuing the question.

## Development

```sh
cd memory-evals
npm install
npm run lint        # eslint
npm run typecheck   # tsc -b across all 3 workspaces
npm test            # vitest in _shared (66 unit tests)
```

### Smoke run (no Kibana required)

The `--dry-run` flag loads the dataset, applies all filters, and prints what
the runner *would* do, without making any HTTP calls. It's the fastest
sanity check after editing dataset/pairing code.

The MAB / Mem2Act / MemGround runners ship with tiny synthetic fixtures
(`<pkg>/data/*_sample.json`, `memground/data/scenarios_sample.json`) so you
can smoke-test them without downloading anything; the LME + LoCoMo runners
use the real datasets placed under `tmp/`.

```sh
npm run longmemeval       -- --dataset ../../tmp/longmemeval_s.json --questions 3 --dry-run
npm run locomo            -- --dataset ../../tmp/locomo10.json    --samples 1 --categories 1,2 --dry-run
npm run memoryagentbench  -- --dataset ../memoryagentbench/data/mab_sample.json --dry-run
npm run mem2act           -- --dataset ../mem2act/data/mem2act_sample.json --dry-run
npm run memground         -- --dataset ../memground/data/scenarios_sample.json --dry-run
```

Expected (verified) output:

```
LongMemEval — Loaded 500 → Selected 3 → would ingest 148 session(s) across 3 question(s).
LoCoMo      — Loaded 10  → Selected 1 → would ingest 19 session(s), then ask 69 question(s).
MAB         — Loaded 4   → Selected 4 → would ingest 4 sample(s), then ask 5 question(s).
Mem2Act     — Loaded 3   → Selected 3 → would ingest 3 sample(s), register 3 unique tool(s), score 3 gold call(s).
MemGround   — Loaded 3   → Selected 3 → would ingest 5 session(s) (6 round(s)), then ask 6 probe(s).
```

## See also

- **[docs/](docs/)** — practical, per-eval runbooks.
- The per-package README under `longmemeval/README.md`, `locomo/README.md`,
  `memoryagentbench/README.md`, `mem2act/README.md`, `memground/README.md`
  — canonical CLI flag reference for each runner.
- [Plan 025](../plans/025_agent_builder_eval_harness_integration.md) — the API
  surface this package consumes.
- [Report 025](../reports/025_agent_builder_eval_harness_integration.md) —
  runbook for the new internal routes.
