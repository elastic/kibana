# Detection Emulation Skill — Complete Demo Guide

PR: https://github.com/elastic/kibana/pull/269019

---

## What This PR Adds

The Detection Emulation feature lets you **validate detection rules by running emulated attacks and measuring whether the rules actually fire**. It has two modes:

- **Log Injection** (safe) — synthesizes ECS documents into a dedicated index; no real endpoints touched
- **Real Execution** (live) — dispatches actual response actions to enrolled endpoints via Fleet

Three surfaces to invoke it:
1. **REST API** — `POST /internal/detection_engine/emulation/validate_rule`
2. **Agent Builder Skill** — natural language via the AI Assistant ("validate rule X")
3. **Workflow YAML** — scheduled periodic validation with auto-case-opening on regression

---

## Prerequisites (Already Running)

| Component | URL | Status |
|-----------|-----|--------|
| Elasticsearch | `http://localhost:29200` | ✅ v9.5.0-SNAPSHOT |
| Kibana | `http://localhost:5601` | ✅ source, RSPack |
| Fleet Server | `http://192.168.3.20:28220` | ✅ Docker |
| Caldera | `http://localhost:8888` | ✅ v5.3.0 |
| Multipass VM | `emulation-endpoint` (192.168.2.71) | ✅ Elastic Defend + Osquery |

**Credentials**: `elastic` / `changeme`

---

## Demo 1: Log Injection via REST API (2 min)

This is the safest and fastest demo — no real endpoints needed.

### Step 1: Pick a rule with Wave-1 MITRE techniques

Good demo rules already installed (1850 prebuilt rules loaded):

| Rule | Rule ID | Wave-1 Techniques | Best For |
|------|---------|-------------------|----------|
| Suspicious MS Office Child Process | `a624863f-a70d-417f-a7d2-7a404638d47f` | T1059.001, T1059.003, T1218.005, T1218.011, T1057 | Multi-technique demo |
| Suspicious JetBrains TeamCity Child Process | `93c7ae2a-d38e-4b4f-ae4e-f8c33d1d3d67` | T1059.001, T1059.003, T1218.005, T1218.011, T1057 | Same breadth |
| Suspicious ScreenConnect Client Child Process | `edf1a5b5-7edb-4ac7-a9f9-29f1c3cf3c12` | T1053.005, T1059.001, T1059.003, T1218.005, T1218.011 | Scheduled task variant |

### Step 2: Enable the rule

```bash
curl -s -u elastic:changeme -XPATCH "http://localhost:5601/api/detection_engine/rules" \
  -H 'kbn-xsrf: true' -H 'elastic-api-version: 2023-10-31' \
  -H 'Content-Type: application/json' \
  -d '{"rule_id":"a624863f-a70d-417f-a7d2-7a404638d47f","enabled":true}'
```

### Step 3: Run emulation (log injection)

```bash
curl -s -X POST 'http://localhost:5601/internal/detection_engine/emulation/validate_rule' \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 1' \
  -H 'Content-Type: application/json' \
  -H 'x-elastic-internal-origin: kibana' \
  -u elastic:changeme \
  -d '{
    "ruleId": "a624863f-a70d-417f-a7d2-7a404638d47f",
    "endpointIds": ["emulation-host-1"],
    "mode": "log_injection"
  }'
```

### Step 4: Interpret the ValidationReport

```jsonc
{
  "report_id":        "abc-123",           // Saved object ID (audit trail)
  "scenario_id":      "sha256-<hex>",      // Deterministic per (rule, techniques)
  "rule_id":          "a624...",
  "mode":             "log_injection",
  "confidence":       0.72,                // 0-1 weighted score
  "coverage":         0.80,                // matched / expected signals
  "precision":        0.60,                // TP / (TP + FP)
  "tp":               4,                   // True positives
  "fp":               2,                   // False positives
  "caveats":          [],                  // [] = clean run
  "matched_signals":  ["Windows PowerShell"],
  "unmatched_signals":["Suspicious Rundll32"],
  "poll_duration_ms": 8234,
  "started_at":       "2026-...",
  "completed_at":     "2026-..."
}
```

**Confidence score interpretation:**

| Range | Meaning |
|-------|---------|
| ≥ 0.80 | Rule fires reliably on covered techniques ✅ |
| 0.50 – 0.79 | Partial coverage — some expected signals didn't fire ⚠️ |
| < 0.50 | Rule likely misses the attack — investigate `unmatched_signals` ❌ |

### Step 5: Verify injected docs in ES

```bash
# Count injected emulation documents
curl -s -u elastic:changeme \
  'http://localhost:29200/.kibana-security-emulation-logs-*/_count' | python3 -m json.tool

# View the actual injected documents
curl -s -u elastic:changeme \
  'http://localhost:29200/.kibana-security-emulation-logs-*/_search?size=3&pretty'
```

### Step 6: Check emulation history (saved objects)

```bash
curl -s -u elastic:changeme \
  'http://localhost:5601/api/saved_objects/_find?type=detection-emulation-report&per_page=5' \
  -H 'kbn-xsrf: true' | python3 -m json.tool
```

---

## Demo 2: Agent Builder UI — Natural Language (3 min)

This shows the AI skill surface — the main user-facing feature.

### Step 1: Open the AI Assistant

Navigate to: **Security → AI Assistant** (chat icon in the top nav)

### Step 2: Ask to validate a rule

Type one of these prompts:

```
Validate detection rule a624863f-a70d-417f-a7d2-7a404638d47f 
against host emulation-host-1 using log injection.
```

Or more naturally:

```
Test my "Suspicious MS Office Child Process" rule against 
endpoint emulation-host-1. Tell me if it detects the techniques 
it's supposed to.
```

### Step 3: Watch the skill flow

The AI will:
1. **Check history** — calls `get-history` to see if this rule was recently validated
2. **Run validation** — calls `validate-rule` with extracted parameters
3. **Present results** — human-readable interpretation of confidence, matched/unmatched signals

### Step 4: Ask follow-up questions

```
Show me the last 5 emulation runs for this rule.
```

```
Why did T1218.011 (Rundll32) not fire? What signals were expected?
```

---

## Demo 3: Command Approval Modal — Real Execution (3 min)

This shows the HITL (Human-in-the-Loop) safety gate for live commands.

### Step 1: Ensure the endpoint is online

```bash
# Verify agent is online with Elastic Defend
curl -s -u elastic:changeme 'http://localhost:5601/api/fleet/agents?perPage=5' \
  -H 'kbn-xsrf: true' | python3 -c "
import sys,json
for a in json.load(sys.stdin).get('items',[]):
    if a.get('policy_id') != 'fleet-server-policy':
        print(f'Agent: {a[\"id\"]}  Status: {a[\"status\"]}')
"
```

Agent ID: `35fa3e72-9b0c-41fd-87e5-dcdaeb5b57d4`

### Step 2: Add agent to allowlist

In Kibana: **Stack Management → Advanced Settings → Security Solution** section:

- **Detection Emulation Allowlist** — add the agent ID: `35fa3e72-9b0c-41fd-87e5-dcdaeb5b57d4`

Or via API:

```bash
curl -s -u elastic:changeme -XPOST \
  'http://localhost:5601/api/kibana/settings' \
  -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{
    "changes": {
      "securitySolution:detectionEmulation:allowlistEndpointIds": "35fa3e72-9b0c-41fd-87e5-dcdaeb5b57d4"
    }
  }'
```

### Step 3: Run real execution via API

```bash
curl -s -X POST 'http://localhost:5601/internal/detection_engine/emulation/validate_rule' \
  -H 'kbn-xsrf: true' \
  -H 'elastic-api-version: 1' \
  -H 'Content-Type: application/json' \
  -H 'x-elastic-internal-origin: kibana' \
  -u elastic:changeme \
  -d '{
    "ruleId": "a624863f-a70d-417f-a7d2-7a404638d47f",
    "endpointIds": ["35fa3e72-9b0c-41fd-87e5-dcdaeb5b57d4"],
    "mode": "real_execution"
  }'
```

### Step 4: Via AI Assistant (shows Command Approval Modal)

```
Run a live emulation for rule a624863f-a70d-417f-a7d2-7a404638d47f 
on endpoint 35fa3e72-9b0c-41fd-87e5-dcdaeb5b57d4.
I need real endpoint execution, not log injection.
```

The **Command Approval Modal** appears showing:
- **Technique** being tested (e.g., T1059.001)
- **Target Host** 
- **Command** to be executed
- **Rationale** for why this command
- **Approve** / **Reject** / **Modify** options

> ⚠️ The modify option lets the operator edit the command/args before approving — useful for adjusting commands to the target environment.

### Step 5: Check response actions history

Navigate to: **Security → Endpoints → Response actions history**

You'll see the dispatched `execute` actions with emulation attribution.

---

## Demo 4: Emulation Badge & Filter in Alerts Table (1 min)

### Step 1: Navigate to Alerts

Go to: **Security → Alerts**

### Step 2: Point out the EMULATION badge

After running a log-injection emulation, alerts generated from emulation docs display an **EMULATION** badge (hollow badge with tooltip showing the emulation ID).

### Step 3: Use the emulation filter

The alerts table toolbar includes an **emulation filter** control that lets you:
- Show all alerts
- Show only emulation alerts
- Hide emulation alerts

This lets analysts distinguish real threats from emulation activity.

---

## Demo 5: Advanced Settings / Guardrails (1 min)

Navigate to: **Stack Management → Advanced Settings → Security Solution**

Show these new settings:

| Setting | Default | Purpose |
|---------|---------|---------|
| **Allowlist Endpoint IDs** | (empty) | Hosts allowed for `real_execution` mode |
| **Rate Limiter: Max Commands** | 100 | Per-space budget (commands/hour) |
| **Rate Limiter: Window (ms)** | 3600000 | Sliding window duration |
| **Rate Limiter: Per-Host Capacity** | 3 | Max commands per host per window |

These are the operator-configurable guardrails:
- **Default-deny allowlist**: `real_execution` blocked unless the operator adds the endpoint
- **Per-space rate limit**: 100 dispatches/space/hour
- **Per-host rate limit**: 3 dispatches/host/hour
- **Concurrency gate**: 1 `real_execution` scenario per space at a time

---

## Demo 6: The Eight-Step Pipeline (Architecture Walkthrough)

For a technical audience, walk through the pipeline:

```
Request
  │
  ▼
1. Flag Gate          ─ checks detectionEmulationLogInjection / RealExecution
2. Authentication     ─ emulation is attributable; rejects anon callers
3. RBAC               ─ real_execution requires endpoint execute privilege
4. Scenario Generator ─ rule MITRE tags → payload library → scenarioId (sha256)
5. Dispatch           ─ log_injection: bulk-index ECS docs
                        real_execution: dispatch response actions via Fleet
6. Telemetry          ─ poll .alerts-security.alerts-* for scenarioId matches
7. Confidence Scorer  ─ coverage × 0.6 + precision × 0.4 → [0, 1]
8. History Write      ─ persist detection-emulation-report saved object
  │
  ▼
ValidationReport
```

### Payload Library (12 Wave-1 Techniques)

| Technique | Name | Command |
|-----------|------|---------|
| T1059.001 | PowerShell | `powershell.exe -NoProfile -Command "Get-Process..."` |
| T1059.003 | cmd.exe | `cmd.exe /c whoami /all & net user...` |
| T1059.004 | Unix Shell | `/bin/sh -c 'id && hostname...'` |
| T1218.005 | Mshta | `mshta.exe vbscript:Execute(...)` |
| T1218.011 | Rundll32 | `rundll32.exe shell32.dll,Control_RunDLL` |
| T1053.005 | Scheduled Task | `schtasks /create /tn emulation_probe...` |
| T1547.001 | Registry Run Keys | `reg add HKCU\Software\...` |
| T1057 | Process Discovery | `tasklist /v` |
| T1003.001 | LSASS Memory | `rundll32.exe comsvcs.dll,MiniDump...` |
| T1070.004 | File Deletion | `del /f %TEMP%\emulation_*` |
| T1071.001 | Web Protocols | `curl http://...` |
| T1112 | Modify Registry | `reg add HKCU\...` |

---

## Demo 7: Workflow — Scheduled Periodic Validation (2 min)

Show the bundled workflow YAML that runs validation daily and opens a case on regression:

File: `src/platform/packages/shared/kbn-workflows/spec/examples/detection_rule_periodic_validation.yml`

Key points:
- **Trigger**: runs every 24h (or manual)
- **Inputs**: `rule_id`, `endpoint_ids`, `mode`, `confidence_threshold`
- **Steps**:
  1. Calls the detection-emulation skill via `ai.agent` step
  2. Branches on `confidence < threshold`
  3. Opens a Kibana Case with full regression details
  4. Optionally notifies Slack
- Uses `log_injection` by default (safe for unattended runs)

---

## Demo 8: Error Handling & Edge Cases (1 min)

### Rule with no MITRE tags

```bash
# Create a minimal custom rule with no threat mapping
curl -s -u elastic:changeme -XPOST 'http://localhost:5601/api/detection_engine/rules' \
  -H 'kbn-xsrf: true' -H 'elastic-api-version: 2023-10-31' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "query",
    "name": "Demo No MITRE Rule",
    "query": "process.name: test",
    "risk_score": 21,
    "severity": "low",
    "description": "Rule with no MITRE tags for demo",
    "index": ["logs-*"],
    "enabled": false
  }' 2>/dev/null | python3 -c "import sys,json; r=json.load(sys.stdin); print(f'Created rule_id={r.get(\"rule_id\")}')"
```

Then try to validate it → expect `no_mitre_tags` (422).

### Feature flag off

If you remove `detectionEmulationLogInjection` from `enableExperimental` → the route returns `feature_flag_disabled` (403).

### Rate limit exceeded

After 100 dispatches in a space, the next one returns `rate_limit_exceeded` (429) with `reset_ms`.

---

## Cleanup

```bash
# Delete emulation log indices (optional — 7-day ILM auto-deletes)
curl -s -u elastic:changeme -XDELETE \
  'http://localhost:29200/.kibana-security-emulation-logs-*'

# Disable the demo rule
curl -s -u elastic:changeme -XPATCH 'http://localhost:5601/api/detection_engine/rules' \
  -H 'kbn-xsrf: true' -H 'elastic-api-version: 2023-10-31' \
  -H 'Content-Type: application/json' \
  -d '{"rule_id":"a624863f-a70d-417f-a7d2-7a404638d47f","enabled":false}'
```

---

## Quick Reference

| Feature | Location |
|---------|----------|
| REST route | `POST /internal/detection_engine/emulation/validate_rule` |
| Agent Builder skill | `detection-emulation` (6 tools: validate-rule, get-history, run-process/file/network/execution-command) |
| Payload library | `server/lib/detection_emulation/payloads/payloads.json` (12 techniques) |
| Log injection index | `.kibana-security-emulation-logs-<spaceId>-*` (7-day ILM) |
| Audit saved object | `detection-emulation-report` (hidden, namespace-scoped) |
| Advanced Settings | Stack Management → Advanced Settings → Security Solution |
| Workflow example | `kbn-workflows/spec/examples/detection_rule_periodic_validation.yml` |
| UI components | EmulationBadge, EmulationFilter, RunEmulationModal |
| Feature flags | `detectionEmulationLogInjection`, `detectionEmulationRealExecution` |
