# Setup

One-time setup that applies to every benchmark. After running through this
page once, the per-eval guides are essentially "supply a dataset + pick a
run id".

## 1. Install

```sh
cd memory-evals
npm install
```

The workspace pins its own ESLint + tsconfig — it is NOT part of Kibana's
yarn workspace. Use `npm`, not `yarn`, from inside `memory-evals/`. Kibana's
top-level `.eslintignore` excludes this folder.

Run from the workspace root unless a guide tells you otherwise.

```sh
npm run typecheck   # tsc -b across all 6 packages
npm run lint        # eslint, same scope
npm test            # vitest in _shared (147 unit tests)
```

## 2. Point at a Kibana

### Required

```sh
export KBN_URL=http://localhost:5601
```

Pick **one** of the two authentication modes:

```sh
# (A) API key — preferred, doesn't change roles between requests
export KBN_API_KEY=<base64 encoded api key>

# or (B) basic auth
export KBN_USERNAME=elastic
export KBN_PASSWORD=changeme
```

### Optional, frequently used

```sh
export KBN_SPACE=default
export KBN_AGENT_ID=default               # the agent to ingest into / converse with
export KBN_CONNECTOR_ID=<llm-connector>   # if your agent supports overriding
```

If `KBN_BASE_PATH` is not set, the client probes `GET /` once and reads the
redirect `Location` header to detect the base path Kibana is serving from
(`/s/<space>/...` patterns are stripped — only the prefix is kept). Set
`KBN_BASE_PATH=''` to disable detection and target the bare root.

### Required permissions on the API key / user

| Route | Required privilege |
| --- | --- |
| `POST /internal/agent_builder/conversations/_import` | `agentBuilder:write` |
| `POST /internal/agent_builder/conversations/_bulk_delete` | `agentBuilder:write` |
| `POST /api/agent_builder/converse` | `agentBuilder:execute` |
| `POST /internal/agent_builder/tools/_bulk_create_mcp` | `agentBuilder:write` (Mem2Act `--register-tools` only) |
| `POST /internal/agent_builder/tools/_bulk_delete` | `agentBuilder:write` (Mem2Act teardown only) |

The Kibana built-in `kibana_admin` role is sufficient for everything above.

## 3. Sanity-check the connection

The cheapest end-to-end check is a dry-run of any runner; it loads the
dataset locally but doesn't call Kibana. The cheapest *live* check is a
single LongMemEval question with teardown disabled so you can inspect the
imported conversation in the UI:

```sh
# (after setting KBN_URL + auth)
npm run longmemeval -- \
  --dataset ../../tmp/longmemeval_s.json \
  --questions 1 \
  --no-teardown \
  --run-id smoke-$(date +%s)
```

If this fails before printing `LongMemEval runner — run_id=...`, the issue is
in argument parsing or the dataset. If it fails after, see
[troubleshooting.md](troubleshooting.md).

## 4. LLM-as-judge (optional but recommended)

Most runners default to `KBN_JUDGE=auto`. `auto` resolves in order:

1. If `ANTHROPIC_API_KEY` is set → AnthropicJudge.
2. Else if `OPENAI_API_KEY` is set → OpenAIJudge.
3. Else → NoopJudge (records predictions, leaves `score: null`).

To pick explicitly:

```sh
export KBN_JUDGE=anthropic                 # require Anthropic, error if no key
export KBN_JUDGE_MODEL=claude-sonnet-4-5   # override default
export ANTHROPIC_API_KEY=sk-ant-...
```

Or:

```sh
export KBN_JUDGE=openai
export KBN_JUDGE_MODEL=gpt-4o-mini
export OPENAI_API_KEY=sk-...
```

Or disable scoring entirely (predictions still recorded — useful when you
want to score later with a different judge):

```sh
export KBN_JUDGE=none
```

### Per-benchmark prompts

The judge picks its prompt template based on the benchmark name passed by the
runner — you never need to set this manually:

| Benchmark | Prompt |
| --- | --- |
| LongMemEval | yes/no/partial against gold answer; reuses the official LME prompt. |
| LoCoMo | Per-category prompt (single-hop, multi-hop, temporal, open, adversarial). |
| MemoryAgentBench | Per-task prompt (AR / TTL / LRU / CR). |
| MemGround | Grounding-specific prompt (yes/partial/no with emphasis on latest-state). |

Mem2ActBench does **not** use the LLM judge — it scores tool calls
deterministically.

## 5. Memory-extract hook (optional)

The plan reserves a hook for the future "memory team" pipeline. When
`KBN_MEMORY_EXTRACT_URL` is unset (the default), nothing is called. When
set, after each conversation import the runner POSTs:

```http
POST <KBN_MEMORY_EXTRACT_URL>
Content-Type: application/json
Authorization: <same headers as KBN_URL>
kbn-xsrf: report-it

{
  "conversation_id": "<uuid>",
  "agent_id": "<agent>",
  "started_at": "2026-05-13T10:00:00.000Z"
}
```

A 2xx is treated as success. Any 4xx/5xx fails the question with a
descriptive error and leaves the conversation intact so you can re-trigger.

To skip the hook ad-hoc without unsetting the env var, pass
`--no-memory-extract` to any runner.

## 6. Agent configuration

The runner expects the agent ID in `KBN_AGENT_ID` to already exist. Set it up
once via the Agent Builder UI or API:

- For LongMemEval / LoCoMo / MemoryAgentBench / MemGround judge probes — any
  agent with memory enabled and a chat connector. No tools required.
- For **Mem2Act with `--register-tools`** — an agent that is wired to an MCP
  Stack connector (`KBN_MCP_CONNECTOR_ID`). The benchmark's no-op MCP server
  must be reachable from Kibana. See [mem2act.md](mem2act.md).
- For **MemGround scenarios that contain `tool_call` probes** — same as
  Mem2Act, and the agent must have those tools allowlisted.

The agent must accept conversations imported via `_import`; this is the
default for any Kibana built-in agent.

## 7. Service-account-per-run

Kibana conversations are user-scoped. If multiple evals run in parallel
against the same Kibana, each should use a **different API key** (or
different user) so that `_bulk_delete` filters by `agent_id` +
`created_after` don't accidentally delete each other's runs. The runner's
deterministic conversation IDs (sha256 of `run_id + sample_id + ...`)
prevent collisions across run_ids, but service-account isolation is the only
defense across concurrent users.

## 8. Where things live on disk

```
memory-evals/
  results/                # NOT created here — created under each runner pkg
  <runner>/
    data/                 # bundled smoke fixtures; real datasets go in ../tmp/
    results/<run-id>/
      state.json          # checkpoint (resume by re-using --run-id)
      results.json
      summary.md
      raw/<question_id>.json
```

`results/` is gitignored. Use `--results-dir <path>` to redirect.

## Next

Pick a benchmark guide:

- [longmemeval.md](longmemeval.md)
- [locomo.md](locomo.md)
- [memoryagentbench.md](memoryagentbench.md)
- [mem2act.md](mem2act.md)
- [memground.md](memground.md)
