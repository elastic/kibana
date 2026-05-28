# Troubleshooting

Common errors, what they mean, and how to fix them. The runner emits errors
with the URL and HTTP status when calls fail, so most issues are easy to
pin down from the log line alone.

## Auth / connection

### `KibanaApiError: HTTP 401 Unauthorized at /...`

Wrong or missing credentials.

- Check `KBN_API_KEY` (must be the *encoded* key, not the `id:secret`
  pair). If you generated via the UI, copy the long base64 string.
- Or use basic auth via `KBN_USERNAME` / `KBN_PASSWORD`.
- API key precedence: `KBN_API_KEY` wins if both are set.

### `KibanaApiError: HTTP 403 Forbidden at /internal/...`

The principal is missing `agentBuilder:write` (for `_import` /
`_bulk_delete` / `_bulk_create_mcp` / tools `_bulk_delete`) or
`agentBuilder:execute` (for `converse`).

- Grant the role `kibana_admin` to the user, or
- Create a feature-scoped role with the relevant Agent Builder privileges.

See [setup.md §2](setup.md).

### `Failed to connect: ECONNREFUSED`

Kibana isn't reachable at `KBN_URL`.

- Is Kibana up? (`curl -I $KBN_URL`)
- VPN / firewall blocking the port?
- Wrong port (`5601` for dev, varies in staging)?

### `Unexpected base path: /api/agent_builder/converse → 404`

Kibana is serving from a non-root base path (e.g. `/kbn`) and auto-detection
failed.

- Inspect the real path: `curl -s -o /dev/null -w '%{redirect_url}\n' $KBN_URL/`
- Set `KBN_BASE_PATH=/kbn` (or whatever the prefix is).
- To disable auto-detection entirely, set `KBN_BASE_PATH=''`.

### Retries

The client retries on `429` and `5xx` with exponential backoff. If you see
`giving up after N retries`, the error is persistent — not transient — so
investigate the Kibana logs (`KIBANA_LOG_LEVEL=debug` in the kibana
process).

## Dataset / loader

### `ENOENT: ...longmemeval_s.json`

The runner runs from inside its package (`memory-evals/longmemeval/`), so
relative paths are relative to there. Canonical paths from the workspace
root in `memory-evals/`:

| Want to point at | Use |
| --- | --- |
| `kibana/tmp/longmemeval_s.json` | `../../tmp/longmemeval_s.json` |
| `kibana/memory-evals/memoryagentbench/data/mab_sample.json` | `../memoryagentbench/data/mab_sample.json` |
| anything in your `$HOME` | absolute path: `/Users/you/data/foo.json` |

### `Dataset must be an array | { samples: [...] } | { data: [...] }`

The loader supports a few wrappers but not arbitrary keys. Either:

- Reshape the file to one of the supported wrappers (see the per-eval
  guide), or
- Pre-process with `jq`:
  ```sh
  jq '{ samples: . }' raw.json > raw.fixed.json
  ```

### `MemoryAgentBench[N] missing or unknown task ("...")`

The loader normalises common task spellings. If yours isn't recognised,
add an alias entry in `_shared/src/dataset.ts:MAB_TASK_ALIASES`. Aliases
are case-insensitive and underscores/hyphens become spaces.

### `MemGround scenario must include at least one probe`

A scenario with only `user_message` / `assistant_message` / `session_break`
events isn't testable. Add at least one `probe`.

### `Mem2ActBench[N] must list at least one gold tool call`

`gold_calls[]` (or an alias) is required for scoring. Synthesise the
expected calls offline before running.

## Ingest / converse

### `409 Conflict: conversation already exists`

The runner uses `mode: 'overwrite'` so this is unusual. Causes:

- Two runs with the same `--run-id` running in parallel against the same
  Kibana. Use different `--run-id`s.
- A previous run created the conversation with `mode: 'create'` (older
  client). Delete it manually:
  ```sh
  curl -X DELETE "$KBN_URL/api/agent_builder/conversations/<id>"
  ```

### `converse returned no message`

The agent answered but the response is empty. Causes & fixes:

- Connector misconfigured → `KBN_CONNECTOR_ID` overrides at runtime.
- Tool execution failed and the agent aborted → check `raw/<id>.json:converse.steps[]`
  for `tool_call` with `results: [{ error: ... }]`.
- Rate limit on the LLM provider → wait, then re-run with the same
  `--run-id` to resume.

### `triggerMemoryExtract failed: HTTP 404`

`KBN_MEMORY_EXTRACT_URL` doesn't point at a valid endpoint. Either fix the
URL or unset the variable to skip the hook.

To skip per-run without unsetting: pass `--no-memory-extract`.

## Scoring

### All `score: null`

The judge isn't configured.

- `KBN_JUDGE=auto` + no `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` set → falls
  back to NoopJudge.
- `KBN_JUDGE=anthropic` but key missing → errors at startup.
- `KBN_JUDGE=none` → intentional, predictions still recorded.

To re-score an existing run with a different judge, you currently need to
delete `results.json` + `state.json` and re-run. (Re-scoring without
re-asking is a planned utility.)

### Judge always returns `partial`

The judge prompt sees an answer it can't classify confidently. Look at
`raw/<id>.json:judge_reason` to see why. Usually:

- Gold answer is too vague (use exact substring instead).
- Predicted answer is hedged ("I think it might be...") — tune agent
  prompt to commit.

### `Mem2Act tool_match=1 but param_match=0`

The agent called the right tool but with different args.

- Inspect `raw/<id>.json:tool_calls.observed[0].params` vs `gold[0].params`.
- Switch to `--score-mode permissive` to only check the keys present in
  gold (extras tolerated).

### `MemGround exact-match returns 0 for clearly-matching prediction`

Watch for:

- Diacritics — the matcher does NFKC + lowercase. `Tomás` matches
  `tomás` matches `Tomas`? No — NFKC keeps accents distinct. Use
  `"exact_regex": true` with a permissive pattern.
- Punctuation — the matcher tokenises on non-letter/digit. `"99 New Ave"`
  matches `"99 new ave."` (no diff after tokenisation).
- Trailing whitespace — both sides are `.trim()`ed.

## Teardown

### `Conversations not deleted after run`

- Did the run actually finish? Mid-run crashes skip teardown. Re-run with
  same `--run-id` to complete + teardown.
- `--no-teardown` was passed.
- `agent_id` filter doesn't match — the bulk-delete uses
  `agent_id: env.agentId`. If you changed agents mid-run, some conversations
  won't be targeted. Use the conversation_ids filter instead:
  ```sh
  curl -X POST "$KBN_URL/internal/agent_builder/conversations/_bulk_delete" \
    -H "Authorization: ApiKey $KBN_API_KEY" \
    -H "kbn-xsrf: report-it" -H "Content-Type: application/json" \
    -d '{"conversation_ids":["<id1>","<id2>",...]}'
  ```
  (IDs are in `results.json:results[].conversation_ids`.)

### `MCP tools persist after run`

- `--no-teardown-tools` was passed.
- The listTools call returned no items matching the tag — check
  `GET $KBN_URL/api/agent_builder/tools` and confirm the namespace.
- Manual cleanup:
  ```sh
  curl -X POST "$KBN_URL/internal/agent_builder/tools/_bulk_delete" \
    -H "Authorization: ApiKey $KBN_API_KEY" \
    -H "kbn-xsrf: report-it" -H "Content-Type: application/json" \
    -d '{"ids":["mem2act-xyz.add_event", "..."], "force": true}'
  ```

## Resume / state corruption

### `Unexpected token in state.json`

`state.json` is written atomically (write to `state.json.tmp` + rename), so
corruption from a crash is rare. If it happens:

- Move the broken file aside: `mv state.json state.json.broken`.
- The next run rebuilds it but re-asks all questions. (Backup
  `results.json` from a previous good run first if you want to preserve
  partials.)

### `Resuming with the same run-id ignores my new data`

`state.json` tracks question_ids. If your dataset added new questions, they
ARE asked on resume; if it changed *existing* questions, the runner uses
cached answers. To pick up changes, either use a new `--run-id` or delete
the cached `state.json` entry manually.

## Performance

### Run is slow / hung on a single question

- LLM connector behind a queue → check Kibana logs.
- Memory extract endpoint slow → pass `--no-memory-extract` to bypass.
- Particularly long haystack on LongMemEval `_m` split → reduce
  `--max-sessions` or scope to fewer `--question-types`.

### Memory usage grows unbounded

Dataset is loaded fully into memory. For `_m` (~hundreds of MB):

- Increase Node heap: `NODE_OPTIONS=--max-old-space-size=8192`.
- Or split the dataset offline:
  ```sh
  jq '.[:50]' longmemeval_m.json > longmemeval_m_first50.json
  ```

## When all else fails

1. Re-run with `--no-teardown` so the imported conversations stay around
   for inspection in the Kibana UI.
2. Inspect `raw/<question_id>.json` — it contains the full
   `converse` response including `steps[]`, judge reason, and the
   QuestionResult.
3. Re-run with `--dry-run` to confirm dataset loading works.
4. Run unit tests: `npm test` (147 of them).
5. If filing a bug, include:
   - The full runner output (it includes URLs + status codes).
   - The relevant `raw/<id>.json`.
   - Dataset path + size (`wc -c < ../../tmp/foo.json`).
   - The Kibana version and `GET /api/status` output.
