# Ingest data (local development)

Use after [run-kibana](run-kibana.md) when prototypes need real data in Discover, dashboards, or solution apps. **All methods below are terminal/API-based** — no Integrations UI clicks required.

**Canonical docs:**

- [Add data (Kibana dev)](https://docs.elastic.dev/kibana-dev-docs/getting-started/sample-data)
- [Installing sample data](https://www.elastic.co/docs/extend/kibana/sample-data)

---

## Agent flow — ask before ingesting

**Do not ingest by default.** After Kibana is running (or starting in background), ask what data the user needs.

### When to ask

- Step 4 of the prototype workflow ([SKILL.md](../SKILL.md))
- User says "load data", "empty states", "sample data", or similar
- User did **not** already specify a data type in the same thread

### Question (use AskQuestion when available)

**Prompt:** "What data should we load into your local stack?"

| Option ID | Label | Use when |
|-----------|-------|----------|
| `skip` | Skip — UI-only prototype | Layout/components only; empty states OK |
| `stack` | Stack / Search (Discover, Lens, dashboards) | Generic analytics, examples plugins, most UI prototypes |
| `observability` | Observability (APM, logs, metrics) | Observability UI, SLOs, service views |
| `security` | Security (alerts, timelines, cases) | Security Solution UI |
| `full` | Everything available locally | Demo that touches multiple areas; slowest |

If the user already said e.g. "I only need Discover", map to `stack` and **do not ask again**.

### Map choice → commands

| Choice | Action |
|--------|--------|
| `skip` | No ingest; tell user how to load later (link this doc) |
| `stack` | [Stack sample data](#stack--search-sample-data) — `flights` + `logs` + `ecommerce` via API |
| `observability` | [Synthtrace](#observability-synthtrace) — `simple_trace.ts --local` |
| `security` | [Security](#security-local) — see limitations; use Elastic security sample-data skill if installed |
| `full` | Stack (all sample sets) + Synthtrace; Security only if user confirms extra setup |

**Default recommendation for design prototypes:** `stack` (fast, dashboards included).

---

## Prerequisites

1. **Elasticsearch** responding: `curl -u elastic:changeme -s -o /dev/null -w "%{http_code}" http://localhost:9200` → `200`
2. **Kibana** responding: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status` → `200` (may be `503` briefly while starting — retry a few times, do not block chat for minutes)

From Kibana repo root:

```sh
cd <KIBANA_REPO_ROOT>
source scripts/kibana_api_common.sh   # sets KIBANA_URL, kibana_curl
```

---

## Stack / Search sample data

Installs indices **and** Kibana saved objects (dashboards, data views). Same as the UI **Sample data** tab.

```sh
source scripts/kibana_api_common.sh

# Optional: list sets and install status
kibana_curl -s "$KIBANA_URL/api/sample_data" | jq '.[] | {id, name, status}'

# Install (run only what the user chose; "stack" = all three)
kibana_curl -X POST "$KIBANA_URL/api/sample_data/flights"
kibana_curl -X POST "$KIBANA_URL/api/sample_data/logs"
kibana_curl -X POST "$KIBANA_URL/api/sample_data/ecommerce"

# TSDB variant (optional, if needed for TSDB work)
# kibana_curl -X POST "$KIBANA_URL/api/sample_data/logstsdb"
```

**Uninstall** (reset): `kibana_curl -X DELETE "$KIBANA_URL/api/sample_data/flights"` (same for `logs`, `ecommerce`).

### Alternative: `makelogs` (ES only)

Writes web logs to Elasticsearch **without** dashboards. User must create a data view manually.

```sh
node scripts/makelogs --auth elastic:changeme
```

Prefer the **sample data API** for prototypes unless the user only needs raw indices.

---

## Observability (Synthtrace)

Requires ES + Kibana up. Installs APM integration as needed when using `--local`.

```sh
node scripts/synthtrace simple_trace.ts --local
```

More scenarios: [Synthtrace README](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-synthtrace/README.md)  
APM local setup: `x-pack/solutions/observability/plugins/apm/dev_docs/local_setup.md`

**Does not** replace full production-like Observability datasets; sufficient for APM/empty-state smoke tests.

---

## Security (local)

Home **sample data does not** populate Elastic Security apps (alerts, timelines, etc.). Security needs ECS-shaped indices and often extra setup.

**Options:**

1. **Elastic plugin skill** (if available in the environment): `security-generate-security-sample-data` — set `ELASTICSEARCH_URL=http://localhost:9200`, `KIBANA_URL=http://localhost:5601`, `elastic` / `changeme`, then run its scripts.
2. **Internal / advanced:** [oblt_cli](https://github.com/elastic/observability-test-environments/blob/main/docs/tools/oblt-cli/CONTRIBUTING.md) (remote cluster + CCS) — not local-only.
3. Tell the user Security local ingest is the heaviest path; confirm before running.

Do **not** promise Security empty states are filled by Stack sample data alone.

---

## Full local set (`full`)

Run in order (each step is finite; OK to block briefly per step):

```sh
source scripts/kibana_api_common.sh

# 1) Stack
for id in flights logs ecommerce; do
  kibana_curl -X POST "$KIBANA_URL/api/sample_data/$id"
done

# 2) Observability
node scripts/synthtrace simple_trace.ts --local

# 3) Security — only if user opted in and tooling is available
# (see Security section)
```

Tell the user: Stack + Obs typically enough for most prototypes; Security is optional and heavier.

---

## Agent execution notes

| Rule | Detail |
|------|--------|
| Ask first | Use the [question flow](#agent-flow--ask-before-ingesting) unless intent is clear |
| Wait for Kibana | Quick `curl` poll (≤30s total in main chat); delegate long waits to shell subagent if needed |
| Non-blocking | Ingest commands are **finite** (unlike `yarn start`); running them in main chat is OK |
| Idempotency | Sample data POST may error if already installed — check `GET /api/sample_data` status first |
| After ingest | Tell user which apps to open (Discover, sample dashboards, APM, Security) |

### Background shell prompt (ingest only)

```
From <KIBANA_REPO_ROOT>, user chose: <stack|observability|security|full|skip>.

1. Poll until http://localhost:5601/api/status returns 200 (max 2 min).
2. Run the commands from ingest-data.md for that choice.
3. Return what was installed and links (e.g. Discover, prebuilt dashboards).
```

---

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `kibana_curl` fails | Kibana not ready; wait or re-run [run-kibana](run-kibana.md) |
| 401 on sample data API | Wrong auth; use `elastic:changeme` for local snapshot |
| Sample data already installed | `GET /api/sample_data` — skip or DELETE then POST |
| Observability still empty | Run synthtrace with `--local`; check APM data view / time range |
| Security still empty | Expected without Security-specific ingest; do not use Stack sample data |