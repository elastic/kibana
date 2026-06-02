# AESOP & Evals — Demo Walk-through

State as of `es-data-20260505-042510.tar.gz` (latest backup).

## Stack control

```bash
# Start everything fresh
.claude/local-dev/elasticsearch/dev-es.sh up
yarn start --no-base-path

# Login: elastic / changeme @ http://localhost:5601
```

## Demo data inventory

### Source data streams (4,300 events across 7d window)
| Data stream | Docs | Why it matters in the demo |
|---|---:|---|
| `logs-endpoint.events.process-default` | 1,000 | Process activity. ~5% suspicious (cryptominer, mimikatz, netcat) — AESOP can spot lateral-movement patterns. |
| `logs-endpoint.events.file-default` | 600 | File create/modify/delete on critical paths (`/etc/shadow`, `~/.ssh/authorized_keys`). |
| `logs-endpoint.events.network-default` | 800 | TCP/UDP/ICMP connections with realistic IP/port distributions. |
| `logs-system.auth-default` | 400 | sshd auth events; ~20% failures, multiple source IPs → SSH spray story. |
| `logs-nginx.access-default` | 1,000 | HTTP access logs. Includes `/wp-admin`, `/.env`, `/api/.../etc/passwd`, sqlmap UA → web-recon story. |
| `metrics-system.cpu-default` | 500 | Host CPU normalized 0–1, gauss-distributed → ops baseline. |

Re-seed at any time:
```bash
python3 .claude/local-dev/seed-demo-data.py
```

### SOC analyst conversations (24 in `.chat-conversations`)

AESOP's `ConversationAnalyzer` scans Agent Builder chat history to
extract automation-worthy patterns. The seed produces 24 SOC-flavored
conversations covering threat hunting, rule management, forensics, alert
triage, IR, and posture/coverage work.

| Surface | Volume | Highlights |
|---|---:|---|
| Conversations | 24 | lateral-movement hunt, beaconing, forensics process tree, rule audit/tuning, IOC sweep, persistence hunt, DNS tunneling, brute-force review |
| Tool usage | 7 distinct (50 calls) | `execute_esql` x29, `list_alerts` x6, `get_rule` x6, `list_rules` x5, `get_alert` x2, `list_endpoints` x1, `list_indices` x1 |
| ES|QL patterns | 23 | auth/network/DNS/process/file indices, alerts index, ATT&CK T1059.001 translation |
| Failure modes | 1 | missing `threatintel-iocs-*` index — automation-worthy gap |
| Recurring flows (≥2x) | 5 | `list_alerts→execute_esql` (6), `get_rule→execute_esql` (5), `execute_esql→execute_esql` (4), `list_rules→get_rule` (4), `get_alert→execute_esql` (2) |

These flows are exactly the kind of high-value, repeatable patterns
AESOP turns into proposed skills. Re-seed at any time:
```bash
python3 .claude/local-dev/seed-soc-conversations.py
```

> NB: `.chat-conversations` is a restricted system index — the script
> uses `system_indices_superuser:changeme`, set up by `dev-es.sh up`.

### Operational data streams (already populated)
| Data stream | Notes |
|---|---|
| `aesop_metrics` | AESOP self-telemetry (workflow start/complete, span IDs). |
| `.kibana-eval-failures` | 3 captured eval failures for the failures view. |
| `.ds-kibana-evaluations-*` | 124 eval execution records. |
| `kibana-evaluation-datasets-000001` | 5 datasets. |
| `kibana-evaluation-dataset-examples-000001` | 40 examples. |

### Proposed skills (9 total)
| Confidence | Skill | Origin |
|---:|---|---|
| 0.95 | Triage Web Recon & Path Traversal on Nginx | LLM (new data) |
| 0.95 | Evaluator Fail-Rate Regression Monitor | LLM |
| 0.90 | Detect Distributed SSH Credential Spray | LLM (new data) |
| 0.90 | data-exploration-ops | LLM |
| 0.90 | CI Build / Commit Eval Regression Triage | LLM |
| 0.90 | AESOP Phantom Target Index Audit | LLM |
| 0.80 | data-exploration-ops-custom | skill_improvement |
| 0.80 | AESOP Redundant Run Burst Detector | LLM |
| 0.75 | ops-investigation-log-first | LLM |

### Evaluators (17 total: 14 prebuilt + 3 demo)
| Source | Count | Examples |
|---|---:|---|
| Prebuilt LLM-judge | 5 | `skill-relevance`, `skill-accuracy`, `skill-completeness`, `skill-specificity`, `skill-safety` |
| Prebuilt CODE | 8 | `skill-pii`, `skill-secret-scanner`, `skill-prompt-injection`, `esql-compile`, `skill-index-resolves`, `agent-efficiency`, `backing-index-validator`, `esql-pattern` |
| Prebuilt ensemble | 1 | `skill-quality-ensemble` (multi-judge aggregator) |
| **Custom demo** | 3 | `demo-clarity-judge` (LLM), `demo-no-hardcoded-creds` (CODE), `demo-skill-uses-real-indices` (ESQL) |

## Demo script

### 1. The "what is AESOP" one-pager
- **AI → Evals → AESOP → Proposed Skills**
- Show 9 skills with mixed origin badges, sorted by confidence.
- Click `Triage Web Recon & Path Traversal on Nginx` (0.95) — best content.

### 2. Skill detail tabs
For the selected skill:
- **Overview** — markdown render of the skill body.
- **Validation** — granular per-evaluator scores (relevance, accuracy, completeness, specificity, safety, secret-scanner, prompt-injection, etc.).
- **Datasets** — auto-generated eval dataset (10 examples).
- **Runs** — past eval runs, scores per evaluator, drill-in to per-example traces.
- **Improvements** — convergence-loop history.

### 3. Manual eval re-run
- On a skill detail page → **Run evaluation** → manual evaluator picker now lists all 17 evaluators (custom demo ones included).
- Pick `demo-no-hardcoded-creds` + `skill-quality-ensemble` → run.

### 4. New evaluator authoring
- **Evaluators tab → Create evaluator → Code/ESQL/LLM-judge**.
- The `{input}` / `{output}` placeholder text now renders correctly (i18n bug fix).

### 5. Re-trigger AESOP autonomous exploration
- Top-right **Run autonomous exploration** → connector `Claude 4.7 Opus` → submit.
- Watch progress stream through Phases 1-5 (~4 min total).
- New skills appear ranked.
- Rate limit: 5/hour per user (was 1; now operator-tunable in `kibana.yml` via `xpack.evals.aesop.rateLimits.exploration.maxRequests`).

### 6. Agent Builder integration
- **Agent Builder → Skills** → existing skills are scored using the same evaluator registry.
- Each skill detail has the **Run evals** button (re-added) which kicks off the same convergence loop and applies LLM-suggested fixes inline.

## Config knobs to mention

```yaml
# kibana.yml — operator-facing AESOP controls
xpack.evals.aesop.enabled: true
xpack.evals.aesop.rateLimits.exploration.maxRequests: 5
xpack.evals.aesop.rateLimits.exploration.windowSeconds: 3600
xpack.evals.aesop.rateLimits.validation.maxRequests: 30
xpack.evals.aesop.rateLimits.approval.maxRequests: 50
```

## Failure-mode guards in place

| Risk | Guard |
|---|---|
| `yarn es snapshot` wipes data | Cursor rule + `AGENTS.md` + `dev-es.sh` refuses to run when yarn ES detected |
| Skill-generator hits Bedrock 8191 max_tokens cap | `salvageObjects()` parser extracts complete prefix objects; logs `salvaged N` |
| Opus 4.7 reasoning > 120 s | Agent timeout bumped to 600 s |
| Bedrock Claude 4.5+ rejects `temperature` | Stripped at every Bedrock subAction (`invokeAI`/`invokeAIRaw`/`converse`/`converseStream`) |
| Lost demo state | `dev-es.sh backup` (with merge-pause) → tar.gz in `backups/`; `dev-es.sh restore <archive>` to roll back |
| Browser routes to `/aesop` blank | Client-side redirect → `/aesop/skills/proposed` |
| ICU MessageFormat errors on Create Evaluator flyout | `{input}`/`{output}` escaped with single quotes |
| Silent skill synthesis skip when no connector | Loud WARN at route entry + at synthesis phase with the precise missing piece |

## Recovery

```bash
# Restore the demo state if anything corrupts ES:
.claude/local-dev/elasticsearch/dev-es.sh down
.claude/local-dev/elasticsearch/dev-es.sh restore \
  .claude/local-dev/elasticsearch/backups/es-data-20260505-042510.tar.gz
.claude/local-dev/elasticsearch/dev-es.sh up
```
