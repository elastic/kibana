# memory-evals — how to run each evaluation

This folder contains step-by-step guides for running each benchmark against a
local or staging Kibana instance.

## Read order

1. **[setup.md](setup.md)** — one-time setup: Kibana, agent configuration,
   env vars, optional LLM-as-judge, optional memory-extract hook.
2. Pick the eval(s) you need to run:
   | Benchmark | Guide | What it tests |
   | --- | --- | --- |
   | LongMemEval (S / M / Oracle) | [longmemeval.md](longmemeval.md) | Long-haystack recall, abstention, temporal reasoning. |
   | LoCoMo (10-sample) | [locomo.md](locomo.md) | Multi-session conversational memory, adversarial categories. |
   | MemoryAgentBench (AR/TTL/LRU/CR) | [memoryagentbench.md](memoryagentbench.md) | Four task families: accurate retrieval, test-time learning, long-range understanding, conflict resolution. |
   | Mem2ActBench | [mem2act.md](mem2act.md) | Tool selection given persisted memory (action grounding). |
   | MemGround | [memground.md](memground.md) | Scenario-driven memory grounding with per-probe scoring strategies. |
3. **[results.md](results.md)** — what's in `results/<run-id>/` and how to
   read it.
4. **[troubleshooting.md](troubleshooting.md)** — common errors and how to
   debug them.

## Common shape across all five runners

Every runner follows the same lifecycle so you can reuse intuition:

```
parseEnv          → load env vars (Kibana URL/auth, agent id, judge config)
loadDataset       → parse the benchmark file (or bundled fixture)
applyFilters      → --samples / --questions / --tasks / --categories / --probes
                    --sample-ids / --scenario-ids / --dry-run
ingest            → POST /internal/agent_builder/conversations/_import
                    (deterministic conversation IDs from sha256(run_id + ...))
memory extract    → optional POST to KBN_MEMORY_EXTRACT_URL
ask               → POST /api/agent_builder/converse (persist: false by default)
score             → LLM-as-judge (anthropic / openai / noop)
                    + Mem2Act tool-call scorer
                    + MemGround exact-match scorer (substring / token / regex)
checkpoint        → state.json after every question (resumable)
teardown          → POST /internal/agent_builder/conversations/_bulk_delete
                    (also _bulk_delete on MCP tools for Mem2Act --register-tools)
report            → results.json + summary.md + raw/<id>.json
```

The CLI flags share names across all runners wherever the semantics are the
same: `--dataset`, `--samples`, `--run-id`, `--results-dir`, `--no-teardown`,
`--no-memory-extract`, `--dry-run`, `--help`.

## Cheat sheet

```sh
cd memory-evals
npm install

# one-time
export KBN_URL=http://localhost:5601
export KBN_API_KEY=<base64 api key>     # or KBN_USERNAME + KBN_PASSWORD
export KBN_AGENT_ID=default
export ANTHROPIC_API_KEY=sk-ant-...     # optional, enables LLM-as-judge
export KBN_JUDGE=auto

# dry-runs (no Kibana calls — sanity check the dataset)
npm run longmemeval       -- --dataset ../../tmp/longmemeval_s.json --questions 3 --dry-run
npm run locomo            -- --dataset ../../tmp/locomo10.json    --samples 1 --dry-run
npm run memoryagentbench  -- --dataset ../memoryagentbench/data/mab_sample.json --dry-run
npm run mem2act           -- --dataset ../mem2act/data/mem2act_sample.json --dry-run
npm run memground         -- --dataset ../memground/data/scenarios_sample.json --dry-run

# full runs (one run id per evaluation; reruns with the same id resume from
# state.json and skip already-scored questions)
npm run longmemeval       -- --dataset ../../tmp/longmemeval_s.json --run-id baseline-2026-05-13
npm run locomo            -- --dataset ../../tmp/locomo10.json     --run-id baseline-2026-05-13
npm run memoryagentbench  -- --dataset ../memoryagentbench/data/mab_sample.json --run-id baseline-2026-05-13
npm run mem2act           -- --dataset ../mem2act/data/mem2act_sample.json --register-tools --run-id baseline-2026-05-13
npm run memground         -- --dataset ../memground/data/scenarios_sample.json --run-id baseline-2026-05-13
```

## Where to find what

| You want… | Look at… |
| --- | --- |
| What env vars exist + how to point at a Kibana | [setup.md](setup.md) |
| Exact CLI flags for one runner | The runner's package README (`../<pkg>/README.md`) |
| End-to-end checklist for one eval | The matching guide in this folder |
| Output file shapes / scoring math | [results.md](results.md) |
| "It says 403 / 409 / nothing extracted" | [troubleshooting.md](troubleshooting.md) |
| HTTP surface this code calls | [../../plans/025_agent_builder_eval_harness_integration.md](../../plans/025_agent_builder_eval_harness_integration.md) |
