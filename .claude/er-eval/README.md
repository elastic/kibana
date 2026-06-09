# ER eval harness

A small, dependency-free Python tool to evaluate the entity-resolution engines
in the `entity_store` plugin. It seeds a known test set, runs resolution, and
scores it **per test case**.

```
.claude/er-eval/
├── fixtures.json        # test set + ground truth
├── output/              # report JSONs (one per run)
└── scripts/
    ├── er_eval.py       # entry point (CLI)
    ├── stack.py         # HTTP client + seeding + provenance
    └── embedding.py     # offline embedding mirror (experiment mode)
```

## Prerequisites

- A local stack running: Kibana on `:5601`, Elasticsearch on `:9200`
  (login `elastic` / `changeme`).
- For the **embedding** engine or any **experiment**: Kibana started with
  `entityAnalyticsEmbeddingResolutionEnabled` in `config/kibana.dev.yml`, and EIS
  connected (so the `_inference` endpoint exists). The **rule** engine needs neither.
- Python 3 (standard library only — nothing to install).

## Two modes

| Mode | What it does | Use it for |
|------|--------------|------------|
| `maintainer` | Seeds fixtures, triggers the **real** rule/embedding maintainers in Kibana, reads the result back, and scores it. | Measuring the shipped engines. |
| `experiment` | Embeds the embedding test cases **itself** (via EIS) under field/threshold settings you choose, runs ES kNN, and scores — without touching the live engine or restarting. | Trying new fields / thresholds. |

### Experiment variants

`experiment` runs one of three variants depending on the flags; each writes a
report named after the variant (e.g. `output/weighted-knn-<ts>.json`):

- **`knn`** (default) — embeds each entity as **one** string built from
  `--embed-fields` (mirrors the maintainer), runs ES kNN, links the single best
  neighbour above `--threshold`. The baseline.
- **`weighted-knn`** (`--embed-group`) — embeds fields as **separate** weighted
  vectors and combines them with a weighted multi-clause kNN (score =
  Σ weightᵢ·cosᵢ, normalised). Lets a discriminating field carry more weight
  than the name. Tests whether per-field weighting beats one blended vector.
- **`llm-gate`** (`--llm-gate`) — after kNN proposes a link, an LLM is asked
  "same person?" and the link is kept only if it says yes. A precision filter:
  it can veto a proposed link but never add one. Composable with the other two
  (`knn-llm-gate`, `weighted-knn-llm-gate`).

## Running the script

**Maintainer (real engines):**
```bash
python3 .claude/er-eval/scripts/er_eval.py maintainer --engine both
python3 .claude/er-eval/scripts/er_eval.py maintainer --engine rule        # no EIS needed
python3 .claude/er-eval/scripts/er_eval.py maintainer --engine embedding
```

**Experiment (offline, tunable):**
```bash
# compare field recipes
python3 .claude/er-eval/scripts/er_eval.py experiment \
  --embed-fields "user.name,user.email" \
  --embed-fields "user.name,user.full_name,user.email"

# sweep a threshold range on one recipe
python3 .claude/er-eval/scripts/er_eval.py experiment \
  --embed-fields "user.name,user.full_name,user.email" \
  --thresholds 0.80,0.95,0.05
```

**Common flags:** `--kibana`, `--es`, `--auth user:pass`, `--fixtures PATH`, `--out PATH`.
**Experiment flags:** `--embed-fields` (repeatable), `--threshold`, `--thresholds` (multiple thresholds to test), `--k`, `--inference-id`.

**Experiment add-ons (optional, opt-in):**
- `--embed-group "FIELDS:WEIGHT"` (repeatable) — embed fields as *separate*
  weighted vectors and combine via weighted kNN, instead of one concatenated
  string. Overrides `--embed-fields` when present. Example:
  ```bash
  python3 .claude/er-eval/scripts/er_eval.py experiment \
    --embed-group "user.name,user.full_name:1.0" \
    --embed-group "user.email:3.0"
  ```
- `--llm-gate` — ask the LLM connector "are these the same person?" before
  linking each above-threshold pair; links only on `yes`. `--llm-connector`
  (default `openai-connector`), `--llm-band "LOW,HIGH"` (only consult the LLM in
  that score band; default = gate every above-threshold link). Composable with
  `--embed-group`.
  ```bash
  python3 .claude/er-eval/scripts/er_eval.py experiment \
    --embed-fields "user.name,user.full_name,user.email" --llm-gate
  ```

Use a different test set with `--fixtures`:
```bash
python3 .claude/er-eval/scripts/er_eval.py maintainer --engine both \
  --fixtures .claude/er-eval/fixtures-with-org.json
```

## What you get

Each run prints a summary and writes the full JSON to `output/`.

**Maintainer:**
```
MAINTAINER EVAL — engine=both  fixtures=fixtures.json
  TEST CASES PASSED: 23/26   (N/A: #8)
  failures:
    #15    [rule]  over-merged 6 pair(s)
    #19    [embedding]  missed 6/10 links
    #24    [embedding]  over-merged 3 pair(s)

  CASE-LEVEL RATES:
    engine        TPR    FNR    TNR    FPR
    merged       0.95   0.05   0.71   0.29
    rule         1.00   0.00   0.80   0.20
    embedding    0.91   0.09   0.67   0.33
```

**Experiment** (one row per recipe × threshold):
```
EXPERIMENT EVAL — fixtures=fixtures.json  inferenceId=.jina-embeddings-v5-text-small
  recipe                                thr   k   cases   TPR   FNR   TNR   FPR
  user.name,user.full_name,user.email  0.85  10  11/13   0.91  0.09  0.67  0.33
```

### How to read it

- **TEST CASES PASSED** — each `#N` fixture is one test case. It passes only if
  its should-link members fully group **and** its should-not-link pairs stay apart.
  `N/A` = fixtures that engine isn't responsible for (e.g. rule cases under an
  embedding-only experiment).
- **failures** — `[engine]` is the engine that caused it; the reason is either a
  missed link (recall) or an over-merge (precision).
- **Case-level rates** (denominators are test cases, not document pairs):
  - **TPR** = should-link cases correctly grouped (recall)
  - **FNR** = should-link cases missed (= 1 − TPR)
  - **TNR** = should-not-link cases kept apart (specificity)
  - **FPR** = should-not-link cases wrongly merged (= 1 − TNR)
  - `merged` pools all engines; per-engine rows scope to each engine's own cases.

## Fixtures

`fixtures.json` holds `entities` (each with a dotted-key `fields` map),
`clusters` (should-link groups, tagged `resolvableBy: rule|embedding|manual`),
`negatives` (should-not-link pairs, tagged with the engine they `challenges`),
and `manualLinks`. Add fields to an entity's `fields` and reference them in
`--embed-fields` to test new identity signals.
