# LoCoMo

[LoCoMo](https://github.com/snap-research/locomo) (Long Conversational
Memory) ships 10 hand-crafted multi-session dialogues between two named
speakers (`speaker_a`, `speaker_b`) over weeks of simulated time, each
followed by ~200 QA pairs across five categories:

| Category | Code | Description |
| --- | --- | --- |
| 1 | single-hop | Answer is in one session. |
| 2 | multi-hop | Needs facts from multiple sessions. |
| 3 | temporal | "When did…", "How long ago…". |
| 4 | open-domain | Free-form factoid the agent can answer with general knowledge if memory is missing. |
| 5 | adversarial | Trap — gold answer is *no information* / abstain. |

Unlike LongMemEval, each LoCoMo sample reuses the same haystack for all
~200 questions, so the runner imports each sample's sessions **once**
under a per-sample agent id and asks all questions against that
conversation.

## 1. Get the dataset

```sh
# from inside memory-evals/
mkdir -p ../tmp
curl -L -o ../tmp/locomo10.json \
  https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json
```

## 2. Prerequisites

Standard [setup.md](setup.md). LoCoMo creates a **per-sample agent id** to
isolate conversations, derived as `eval-locomo-<run_id>-<sample_id>`. Your
`KBN_AGENT_ID` is used as the base config — the runner reuses its tools /
memory settings and only changes the id.

## 3. Dry-run first

```sh
npm run locomo -- \
  --dataset ../../tmp/locomo10.json \
  --samples 1 \
  --dry-run
```

Expected:

```
LoCoMo runner — run_id=locomo-<timestamp>
Loaded 10 sample(s).
Selected 1 sample(s) after filters.
DRY RUN — would ingest 19 session(s) across 1 sample(s), then ask 199 question(s). No Kibana calls made.
```

## 4. Small live run (smoke)

The cheapest meaningful run is one sample × one category × a handful of
questions:

```sh
npm run locomo -- \
  --dataset ../../tmp/locomo10.json \
  --samples 1 \
  --categories 1 \
  --questions 10 \
  --run-id smoke-$(date +%s)
```

`--categories 1` runs only single-hop questions, which are easiest and
fastest. Use `--categories 1,2,3,4,5` to cover all.

## 5. Full run

```sh
npm run locomo -- \
  --dataset ../../tmp/locomo10.json \
  --run-id baseline-2026-05-13
```

10 samples × ~200 questions = ~2k converse calls. Each sample shares its
imported haystack across all its questions, so total ingest is bounded by
~190 conversation imports (one per session per sample). Reruns with the
same `--run-id` resume.

## 6. Flag reference

| Flag | Effect |
| --- | --- |
| `--samples N` | First N samples (after `--sample-ids`). |
| `--sample-ids id1,id2` | Run only the listed sample ids. |
| `--categories 1,2,5` | Restrict to listed QA categories (1–5). |
| `--questions N` | Cap questions **per sample**. |
| `--max-sessions N` | Cap haystack sessions imported per sample (debug). |
| `--run-id <name>` | Resume / namespace. |
| `--no-teardown` | Skip `_bulk_delete` after the run. |
| `--no-memory-extract` | Skip memory-extract POST. |
| `--results-dir <path>` | Override output location. |
| `--dry-run` | Plan only. |

Full reference: `locomo/README.md`.

## 7. What the runner does per sample

1. **Plan** — read `conversation.sessions[].turns[]`, map `speaker_a → user`,
   `speaker_b → assistant`. Multimodal turns (images, blip captions) are
   flattened into the textual content as `[image: caption]`.
2. **Per-sample agent** — generate `agent_id = eval-locomo-<run_id>-<sample_id>`
   and ensure-create it via the agent management API. This lets bulk-delete
   target *just this sample's* conversations after the run.
3. **Import** — one conversation per session with deterministic id
   (`sha256(run_id + sample_id + session_idx)`).
4. **Memory extract** — once per session (optional).
5. **Ask** — for each QA pair, `converse(persist: false)` against the
   per-sample agent. The agent has only memory of the imported sessions —
   no live history.
6. **Score** — judge with the LoCoMo prompt for the matching category.
   Category 5 (adversarial) uses an abstention-specific rubric.
7. **Teardown** — `_bulk_delete` by `agent_id` so we don't touch other
   runs' data.

## 8. Reading results

See [results.md](results.md). The `results.json` `category_scores` is the
primary view:

```jsonc
{
  "category_scores": {
    "1": { "correct": 32, "partial": 4, "total": 40, "accuracy": 80.0 },
    "2": { "correct": 18, "partial": 5, "total": 35, "accuracy": 51.4 },
    "5": { "correct": 12, "partial": 0, "total": 20, "accuracy": 60.0 }
  }
}
```

A low category-5 score usually means the agent over-answers when memory is
empty — tune your agent's abstention prompt.

## 9. Common pitfalls

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Conflict: agent already exists` mid-run | Two parallel runs with the same `--run-id` against the same Kibana | Use different `--run-id`s. |
| All adversarial scores 0 even with a strong agent | Judge prompt expects abstention phrasing | Inspect `raw/<id>.json:judge_reason`; tune agent or judge prompt. |
| `Loaded 0 sample(s)` | Wrong `locomo10.json` schema (e.g. nested under `data`) | The loader accepts both root array and `{ data: [...] }`; if neither, inspect the file. |
| Memory extract called 190× and slow | Set `--no-memory-extract` for offline testing | Or batch the extract endpoint server-side. |

More in [troubleshooting.md](troubleshooting.md).
