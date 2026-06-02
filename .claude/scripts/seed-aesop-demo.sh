#!/usr/bin/env bash
# Seed AESOP demo data: proposed skills + exploration history + patterns/relationships.
# Safe to re-run: deletes & recreates the seed indices.
#
# Usage:
#   ES_URL=http://localhost:9200 ES_AUTH=elastic:changeme ./.claude/scripts/seed-aesop-demo.sh

set -euo pipefail

ES_URL="${ES_URL:-http://localhost:9200}"
ES_AUTH="${ES_AUTH:-elastic:changeme}"

# Portable ISO-8601 timestamp relative to "now" in seconds (uses BSD date on macOS, GNU date elsewhere).
iso_at() {
  local offset_seconds="$1"
  if date -v -1S '+%Y' >/dev/null 2>&1; then
    date -u -v "${offset_seconds}S" '+%Y-%m-%dT%H:%M:%S.000Z'
  else
    date -u -d "${offset_seconds} seconds" '+%Y-%m-%dT%H:%M:%S.000Z'
  fi
}

NOW=$(iso_at 0)
H1_AGO=$(iso_at -3600)
H2_AGO=$(iso_at -7200)
H3_AGO=$(iso_at -10800)
D1_AGO=$(iso_at -86400)
D2_AGO=$(iso_at -172800)
D3_AGO=$(iso_at -259200)

# Execution IDs we'll cross-reference between skills, patterns, and executions.
EXEC_LATEST="exec-2025-security-ops-01"
EXEC_PREV="exec-2025-security-ops-00"
EXEC_RUNNING="exec-2025-security-ops-02"

echo ">>> Seeding AESOP demo data against ${ES_URL}"

# ─── Reset seed indices ─────────────────────────────────────────────────────
for idx in \
  .aesop-proposed-skills \
  .aesop-workflow-executions \
  .aesop-discovered-patterns \
  .aesop-discovered-relationships; do
  echo "    - resetting ${idx}"
  curl -fsS -u "${ES_AUTH}" -o /dev/null -w "      delete: HTTP %{http_code}\n" \
    -X DELETE "${ES_URL}/${idx}?ignore_unavailable=true" || true
done

# ─── Create indices with mappings ───────────────────────────────────────────
echo ">>> Creating indices with mappings"

curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    .aesop-proposed-skills: HTTP %{http_code}\n" \
  -X PUT "${ES_URL}/.aesop-proposed-skills" \
  -H 'Content-Type: application/json' -d '{
    "mappings": {
      "properties": {
        "name": { "type": "keyword" },
        "description": { "type": "text" },
        "markdown": { "type": "text" },
        "confidence": { "type": "float" },
        "derived_from": { "type": "keyword" },
        "improvement_type": { "type": "keyword" },
        "metadata": {
          "properties": {
            "created_at": { "type": "date" },
            "exploration_execution_id": { "type": "keyword" },
            "cycle_number": { "type": "integer" },
            "indices_explored": { "type": "integer" },
            "source_indices": { "type": "keyword" }
          }
        },
        "source": {
          "properties": {
            "pattern_id": { "type": "keyword" },
            "pattern_frequency": { "type": "integer" },
            "rationale": { "type": "text" }
          }
        },
        "validation": {
          "properties": {
            "status": { "type": "keyword" },
            "final_score": { "type": "float" },
            "composite_score": { "type": "float" },
            "composite_grade": { "type": "keyword" },
            "completed_at": { "type": "date" },
            "duration_ms": { "type": "integer" }
          }
        },
        "review": {
          "properties": {
            "status": { "type": "keyword" },
            "reviewed_at": { "type": "date" },
            "reviewed_by": { "type": "keyword" }
          }
        }
      }
    }
  }'

curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    .aesop-workflow-executions: HTTP %{http_code}\n" \
  -X PUT "${ES_URL}/.aesop-workflow-executions" \
  -H 'Content-Type: application/json' -d '{
    "mappings": {
      "properties": {
        "workflow_name": { "type": "keyword" },
        "status": { "type": "keyword" },
        "started_at": { "type": "date" },
        "completed_at": { "type": "date" },
        "updated_at": { "type": "date" },
        "error_message": { "type": "text" },
        "config": {
          "properties": {
            "agent_role": { "type": "keyword" },
            "scoped_indices": { "type": "keyword" }
          }
        },
        "metrics": {
          "properties": {
            "indices_explored": { "type": "integer" },
            "relationships_discovered": { "type": "integer" },
            "patterns_found": { "type": "integer" },
            "skills_generated": { "type": "integer" }
          }
        }
      }
    }
  }'

curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    .aesop-discovered-patterns: HTTP %{http_code}\n" \
  -X PUT "${ES_URL}/.aesop-discovered-patterns" \
  -H 'Content-Type: application/json' -d '{
    "mappings": {
      "properties": {
        "pattern_id": { "type": "keyword" },
        "pattern_name": { "type": "keyword" },
        "frequency": { "type": "integer" },
        "confidence": { "type": "float" },
        "exploration_execution_id": { "type": "keyword" },
        "discovered_at": { "type": "date" },
        "rationale": { "type": "text" },
        "source_indices": { "type": "keyword" }
      }
    }
  }'

curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    .aesop-discovered-relationships: HTTP %{http_code}\n" \
  -X PUT "${ES_URL}/.aesop-discovered-relationships" \
  -H 'Content-Type: application/json' -d '{
    "mappings": {
      "properties": {
        "from": { "type": "keyword" },
        "to": { "type": "keyword" },
        "via": { "type": "keyword" },
        "confidence": { "type": "float" },
        "shared_value_count": { "type": "integer" },
        "exploration_execution_id": { "type": "keyword" },
        "discovered_at": { "type": "date" }
      }
    }
  }'

# ─── Seed workflow executions ───────────────────────────────────────────────
echo ">>> Seeding workflow executions"

bulk_executions=$(cat <<EOF
{ "index": { "_index": ".aesop-workflow-executions", "_id": "${EXEC_LATEST}" } }
{ "workflow_name": "self_exploration", "status": "completed", "started_at": "${H2_AGO}", "completed_at": "${H1_AGO}", "updated_at": "${H1_AGO}", "config": { "agent_role": "security_analyst", "scoped_indices": ["logs-endpoint.alerts-*", "logs-endpoint.events.process-*", ".alerts-security.alerts-*"] }, "metrics": { "indices_explored": 12, "relationships_discovered": 18, "patterns_found": 7, "skills_generated": 5 } }
{ "index": { "_index": ".aesop-workflow-executions", "_id": "${EXEC_PREV}" } }
{ "workflow_name": "self_exploration", "status": "completed", "started_at": "${D1_AGO}", "completed_at": "${D1_AGO}", "updated_at": "${D1_AGO}", "config": { "agent_role": "security_analyst", "scoped_indices": ["logs-endpoint.events.process-*", "logs-system.auth-*"] }, "metrics": { "indices_explored": 8, "relationships_discovered": 11, "patterns_found": 4, "skills_generated": 3 } }
{ "index": { "_index": ".aesop-workflow-executions", "_id": "${EXEC_RUNNING}" } }
{ "workflow_name": "self_exploration", "status": "running", "started_at": "${NOW}", "updated_at": "${NOW}", "config": { "agent_role": "security_analyst", "scoped_indices": ["logs-kibana.audit-*"] }, "metrics": { "indices_explored": 2, "relationships_discovered": 1, "patterns_found": 0, "skills_generated": 0 } }
EOF
)
printf '%s\n\n' "${bulk_executions}" | curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    executions bulk: HTTP %{http_code}\n" \
  -X POST "${ES_URL}/_bulk?refresh=true" \
  -H 'Content-Type: application/x-ndjson' --data-binary @-

# ─── Seed discovered patterns ───────────────────────────────────────────────
echo ">>> Seeding discovered patterns"

bulk_patterns=$(cat <<EOF
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-001", "pattern_name": "suspicious-powershell-encoded-command", "frequency": 342, "confidence": 0.92, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Repeated PowerShell process events with -EncodedCommand flag across 18 hosts", "source_indices": ["logs-endpoint.events.process-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-002", "pattern_name": "alert-to-endpoint-correlation", "frequency": 217, "confidence": 0.88, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Each alerts document correlates to one or more endpoint events via host.name and event.id", "source_indices": [".alerts-security.alerts-*", "logs-endpoint.events.process-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-003", "pattern_name": "failed-logon-burst", "frequency": 156, "confidence": 0.81, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": ">10 failed logons per source.ip within 5m windows", "source_indices": ["logs-system.auth-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-004", "pattern_name": "cve-impact-across-hosts", "frequency": 89, "confidence": 0.76, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Vulnerability documents tagged with CVE IDs cluster across shared host.os.version ranges", "source_indices": ["logs-vulnerabilities.*", "logs-endpoint.metadata-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-005", "pattern_name": "suspicious-process-chain", "frequency": 74, "confidence": 0.84, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Parent/child process lineage with unsigned binaries and short-lived children", "source_indices": ["logs-endpoint.events.process-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-006", "pattern_name": "kibana-audit-config-changes", "frequency": 41, "confidence": 0.79, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Kibana audit events with action.type=saved_object_change on alerting/rule objects", "source_indices": ["logs-kibana.audit-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-007", "pattern_name": "stale-indices-over-30d", "frequency": 22, "confidence": 0.95, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}", "rationale": "Indices matching logs-* with no ingest in >30 days and ILM not managed", "source_indices": ["logs-*"] }
{ "index": { "_index": ".aesop-discovered-patterns" } }
{ "pattern_id": "p-008", "pattern_name": "detection-rule-tuning-opportunity", "frequency": 64, "confidence": 0.73, "exploration_execution_id": "${EXEC_PREV}", "discovered_at": "${D1_AGO}", "rationale": "Detection rules firing >100 times/day with low analyst dismissal rate", "source_indices": [".alerts-security.alerts-*"] }
EOF
)
printf '%s\n\n' "${bulk_patterns}" | curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    patterns bulk: HTTP %{http_code}\n" \
  -X POST "${ES_URL}/_bulk?refresh=true" \
  -H 'Content-Type: application/x-ndjson' --data-binary @-

# ─── Seed discovered relationships ──────────────────────────────────────────
echo ">>> Seeding discovered relationships"

bulk_rels=$(cat <<EOF
{ "index": { "_index": ".aesop-discovered-relationships" } }
{ "from": ".alerts-security.alerts-*", "to": "logs-endpoint.events.process-*", "via": "host.name + event.id", "confidence": 0.94, "shared_value_count": 217, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}" }
{ "index": { "_index": ".aesop-discovered-relationships" } }
{ "from": "logs-endpoint.events.process-*", "to": "logs-endpoint.events.file-*", "via": "host.name + process.entity_id", "confidence": 0.91, "shared_value_count": 184, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}" }
{ "index": { "_index": ".aesop-discovered-relationships" } }
{ "from": "logs-endpoint.events.process-*", "to": "logs-endpoint.events.network-*", "via": "host.name + process.entity_id", "confidence": 0.87, "shared_value_count": 142, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}" }
{ "index": { "_index": ".aesop-discovered-relationships" } }
{ "from": "logs-system.auth-*", "to": "logs-endpoint.events.process-*", "via": "host.name + user.name", "confidence": 0.82, "shared_value_count": 96, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}" }
{ "index": { "_index": ".aesop-discovered-relationships" } }
{ "from": "logs-vulnerabilities.*", "to": "logs-endpoint.metadata-*", "via": "host.id", "confidence": 0.78, "shared_value_count": 54, "exploration_execution_id": "${EXEC_LATEST}", "discovered_at": "${H1_AGO}" }
EOF
)
printf '%s\n\n' "${bulk_rels}" | curl -fsS -u "${ES_AUTH}" -o /dev/null -w "    relationships bulk: HTTP %{http_code}\n" \
  -X POST "${ES_URL}/_bulk?refresh=true" \
  -H 'Content-Type: application/x-ndjson' --data-binary @-

# ─── Seed proposed skills ───────────────────────────────────────────────────
echo ">>> Seeding proposed skills"

# Use a single NDJSON blob with embedded markdown. Inline markdown must keep
# the \n escape sequences as literal characters so JSON stays valid.
bulk_skills=$(cat <<'EOF'
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-detect-suspicious-powershell" } }
{ "name": "detect-suspicious-powershell", "description": "Identify PowerShell invocations using encoded, hidden, or obfuscated commands across endpoint process events, and surface the impacted hosts and users.", "markdown": "# detect-suspicious-powershell\n\n**Purpose.** Surface PowerShell process events that look evasive: `-EncodedCommand`, `-NoProfile -WindowStyle Hidden`, base64 payloads, or unusual parent processes (e.g. `winword.exe` -> `powershell.exe`).\n\n## Inputs\n- Optional `time_range` (default: last 24h)\n- Optional `host_filter` (list of `host.name`)\n\n## Steps\n1. Query `logs-endpoint.events.process-*` for `process.name: powershell.exe` with suspicious `process.args`.\n2. Group by `host.name`, `user.name`, `process.parent.name`.\n3. Join with `.alerts-security.alerts-*` on `host.name + process.entity_id` to surface any existing alerts.\n4. Return a ranked table with count, first/last seen, sample command lines (truncated), and parent process.\n\n## Output\nMarkdown table + top-3 command-line examples per host.", "confidence": 0.92, "derived_from": "patterns", "improvement_type": "new", "metadata": { "created_at": "__H1_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 1, "indices_explored": 3, "source_indices": ["logs-endpoint.events.process-*", ".alerts-security.alerts-*"] }, "source": { "pattern_id": "p-001", "pattern_frequency": 342, "rationale": "342 PowerShell events with encoded/hidden flags across 18 hosts in 24h." }, "validation": { "status": "passed", "final_score": 0.91, "composite_score": 0.89, "composite_grade": "A-", "completed_at": "__H1_AGO__", "duration_ms": 48000 }, "review": { "status": "pending_review" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-correlate-alert-and-endpoint" } }
{ "name": "correlate-alert-and-endpoint", "description": "Join a security alert to the endpoint process, file, and network events on the same host within ±5 minutes to produce a complete incident timeline.", "markdown": "# correlate-alert-and-endpoint\n\n**Purpose.** Given an `alert.id`, build a minute-by-minute timeline of related endpoint activity on the same host so an analyst can triage without hopping between indices.\n\n## Inputs\n- `alert_id` (required)\n- `window_minutes` (default: 10)\n\n## Steps\n1. Fetch the alert from `.alerts-security.alerts-*`, extract `host.name` and `@timestamp`.\n2. Query `logs-endpoint.events.process-*`, `...file-*`, `...network-*` for the same `host.name` within `@timestamp ± window_minutes`.\n3. Merge and sort events chronologically.\n4. Annotate with severity hints: unsigned binaries, external IPs, sensitive file paths.\n\n## Output\nTimeline of 20-80 events with event kind, command line / file path / destination IP, and severity badge.", "confidence": 0.88, "derived_from": "relationships", "improvement_type": "new", "metadata": { "created_at": "__H1_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 1, "indices_explored": 4, "source_indices": [".alerts-security.alerts-*", "logs-endpoint.events.process-*", "logs-endpoint.events.file-*", "logs-endpoint.events.network-*"] }, "source": { "pattern_id": "p-002", "pattern_frequency": 217, "rationale": "Every alert sampled had on average 4.7 correlated endpoint events within ±10min on same host." }, "validation": { "status": "passed", "final_score": 0.88, "composite_score": 0.87, "composite_grade": "B+", "completed_at": "__H1_AGO__", "duration_ms": 52000 }, "review": { "status": "pending_review" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-summarize-cve-impact" } }
{ "name": "summarize-cve-impact", "description": "For a given CVE ID, list affected hosts by OS/version, total impacted user count, and whether any related alerts have fired recently.", "markdown": "# summarize-cve-impact\n\n**Purpose.** Quickly answer \"who is at risk\" for a newly disclosed CVE without pivoting through 3 dashboards.\n\n## Inputs\n- `cve_id` (e.g. `CVE-2025-12345`)\n\n## Steps\n1. Look up the CVE in `logs-vulnerabilities.*` to extract affected software / versions.\n2. Query `logs-endpoint.metadata-*` for hosts matching those versions.\n3. Query `.alerts-security.alerts-*` for related alerts (rule tags containing the CVE).\n4. Aggregate by `host.os.family`, `host.os.version`, and count affected users.\n\n## Output\nSummary card (totals), affected-host table, recent-alerts list.", "confidence": 0.76, "derived_from": "llm", "improvement_type": "new", "metadata": { "created_at": "__H1_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 1, "indices_explored": 3, "source_indices": ["logs-vulnerabilities.*", "logs-endpoint.metadata-*", ".alerts-security.alerts-*"] }, "source": { "pattern_id": "p-004", "pattern_frequency": 89, "rationale": "Repeated analyst questions in agent chat: 'what hosts are impacted by CVE X?'" }, "validation": { "status": "failed", "final_score": 0.54, "composite_score": 0.58, "composite_grade": "D", "completed_at": "__H1_AGO__", "duration_ms": 61000 }, "review": { "status": "pending_review" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-find-stale-indices" } }
{ "name": "find-stale-indices", "description": "Detect indices matching logs-* that have had no new documents ingested for more than 30 days and are not managed by ILM.", "markdown": "# find-stale-indices\n\n**Purpose.** Cost hygiene: surface data-streams/indices that are still using hot-tier storage but are no longer ingesting.\n\n## Inputs\n- Optional `index_pattern` (default: `logs-*`)\n- Optional `stale_days` (default: 30)\n\n## Steps\n1. Call `_cat/indices?h=index,docs.count,creation.date,size` for the pattern.\n2. For each index, sample latest `@timestamp` via `search?size=1&sort=@timestamp:desc`.\n3. Check ILM status via `_ilm/explain`.\n4. Emit a table of indices with `last_ingest_age_days > stale_days` and `ilm.managed=false`.\n\n## Output\nTable: index name, size, last ingest age, ILM managed, recommendation (delete / attach ILM).", "confidence": 0.95, "derived_from": "patterns", "improvement_type": "new", "metadata": { "created_at": "__H1_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 1, "indices_explored": 1, "source_indices": ["logs-*"] }, "source": { "pattern_id": "p-007", "pattern_frequency": 22, "rationale": "22 log indices with no ingest in 30+ days, all unmanaged by ILM." }, "validation": { "status": "pending" }, "review": { "status": "pending_review" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-explain-detection-rule-alert" } }
{ "name": "explain-detection-rule-alert", "description": "Given an alert from Elastic Security, explain in plain English which detection rule fired, why it matched, and what a human analyst should check next.", "markdown": "# explain-detection-rule-alert\n\n**Purpose.** Reduce triage time by translating a raw alert into an analyst-friendly paragraph.\n\n## Inputs\n- `alert_id` (required)\n\n## Steps\n1. Load the alert from `.alerts-security.alerts-*`.\n2. Resolve `kibana.alert.rule.uuid` to the rule definition from the detection engine.\n3. Extract the matched fields and highlight deviations from baseline.\n4. Return: rule purpose, what triggered it, suggested next pivots.\n\n## Output\n3-5 sentence explanation + \"next steps\" bullet list.", "confidence": 0.9, "derived_from": "conversations", "improvement_type": "new", "metadata": { "created_at": "__D1_AGO__", "exploration_execution_id": "__EXEC_PREV__", "cycle_number": 1, "indices_explored": 2, "source_indices": [".alerts-security.alerts-*"] }, "source": { "pattern_id": "p-008", "pattern_frequency": 64, "rationale": "Analysts ask 'why did this alert fire' ~64 times/week in chat logs." }, "validation": { "status": "passed", "final_score": 0.93, "composite_score": 0.91, "composite_grade": "A", "completed_at": "__D1_AGO__", "duration_ms": 44000 }, "review": { "status": "approved", "reviewed_at": "__D1_AGO__", "reviewed_by": "elastic" }, "deployment": { "deployed": true, "deployed_at": "__D1_AGO__", "agent_builder_skill_id": "ab-skill-explain-detection-rule-alert" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-investigate-failed-logon-burst" } }
{ "name": "investigate-failed-logon-burst", "description": "Triage bursts of failed logons from a single source IP against one or more accounts.", "markdown": "# investigate-failed-logon-burst\n\n**Purpose.** Classify a failed-logon burst as bruteforce vs. misconfigured service vs. benign.\n\n## Inputs\n- `source_ip` (required)\n- `window_minutes` (default: 15)\n\n## Steps\n1. Query `logs-system.auth-*` for failed auth events from `source.ip` in window.\n2. Count unique `user.name` and `host.name` targets.\n3. Check for any successful logons from the same `source.ip` after the burst.\n4. Enrich `source.ip` with threat intel (if available).\n\n## Output\nClassification + evidence list.", "confidence": 0.62, "derived_from": "patterns", "improvement_type": "new", "metadata": { "created_at": "__D2_AGO__", "exploration_execution_id": "__EXEC_PREV__", "cycle_number": 1, "indices_explored": 1, "source_indices": ["logs-system.auth-*"] }, "source": { "pattern_id": "p-003", "pattern_frequency": 156, "rationale": "Bursts of >10 failed logons per source IP in 5-min windows are common." }, "validation": { "status": "failed", "final_score": 0.48, "composite_score": 0.52, "composite_grade": "F", "completed_at": "__D2_AGO__", "duration_ms": 58000 }, "review": { "status": "rejected", "reviewed_at": "__D1_AGO__", "reviewed_by": "elastic", "rejection_reason": "Duplicates existing detection rule 'Multiple Failed Logins from Single IP'; no new value." } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-improve-suspicious-process-chain" } }
{ "name": "suspicious-process-chain", "description": "Detect and summarize suspicious parent/child process chains, now scoped more tightly to unsigned binaries and short-lived children to reduce noise.", "markdown": "# suspicious-process-chain (v2)\n\n**Purpose.** Refined version of the existing `suspicious-process-chain` skill to cut false positives.\n\n## What changed\n- Exclude signed Microsoft binaries from the \"suspicious\" list.\n- Require the child process to be short-lived (<30s) OR spawn a network connection.\n- Add top-N ranking by how rare the parent/child tuple is.\n\n## Steps\n1. Query `logs-endpoint.events.process-*` for parent/child pairs in the window.\n2. Apply filters above.\n3. Rank by global rarity of the `parent.name -> child.name` tuple.\n4. Return top 20.", "content": "# suspicious-process-chain (v2)\n\n...(same as markdown)...", "confidence": 0.84, "derived_from": "skill_improvement", "improvement_type": "improvement", "variant_group_id": "vg-suspicious-process-chain", "variant_label": "v2-tightened", "base_skill": { "id": "ab-skill-suspicious-process-chain", "name": "suspicious-process-chain", "readonly": false }, "metadata": { "created_at": "__H2_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 2, "indices_explored": 1, "source_indices": ["logs-endpoint.events.process-*"] }, "source": { "pattern_id": "p-005", "pattern_frequency": 74, "rationale": "Existing skill was flagged noisy in feedback logs; this variant narrows criteria." }, "validation": { "status": "passed", "final_score": 0.86, "composite_score": 0.84, "composite_grade": "B+", "completed_at": "__H1_AGO__", "duration_ms": 71000 }, "review": { "status": "pending_review" } }
{ "index": { "_index": ".aesop-proposed-skills", "_id": "skill-triage-kibana-audit-events" } }
{ "name": "triage-kibana-audit-events", "description": "Summarize recent Kibana audit events that touched alerting/rule saved objects and highlight the actor, time, and object affected.", "markdown": "# triage-kibana-audit-events\n\n**Purpose.** Answer \"who changed which rule and when?\" from the Kibana audit log.\n\n## Inputs\n- Optional `time_range` (default: last 7 days)\n\n## Steps\n1. Query `logs-kibana.audit-*` for `event.action: saved_object_*` with `kibana.saved_object.type` in (`alert`, `rule`, `action`).\n2. Group by `user.name`, `kibana.saved_object.type`, `kibana.saved_object.id`.\n3. Annotate with the action kind (create/update/delete).\n4. Return a chronological table.\n\n## Output\nTable: when, who, action, object type, object id.", "confidence": 0.79, "derived_from": "llm", "improvement_type": "new", "metadata": { "created_at": "__H2_AGO__", "exploration_execution_id": "__EXEC_LATEST__", "cycle_number": 1, "indices_explored": 1, "source_indices": ["logs-kibana.audit-*"] }, "source": { "pattern_id": "p-006", "pattern_frequency": 41, "rationale": "Frequent audit-log questions from SRE users via agent chat." }, "validation": { "status": "passed", "final_score": 0.82, "composite_score": 0.80, "composite_grade": "B", "completed_at": "__H1_AGO__", "duration_ms": 39000 }, "review": { "status": "pending_review" } }
EOF
)

# Substitute timestamp + execution placeholders.
bulk_skills="${bulk_skills//__NOW__/${NOW}}"
bulk_skills="${bulk_skills//__H1_AGO__/${H1_AGO}}"
bulk_skills="${bulk_skills//__H2_AGO__/${H2_AGO}}"
bulk_skills="${bulk_skills//__H3_AGO__/${H3_AGO}}"
bulk_skills="${bulk_skills//__D1_AGO__/${D1_AGO}}"
bulk_skills="${bulk_skills//__D2_AGO__/${D2_AGO}}"
bulk_skills="${bulk_skills//__D3_AGO__/${D3_AGO}}"
bulk_skills="${bulk_skills//__EXEC_LATEST__/${EXEC_LATEST}}"
bulk_skills="${bulk_skills//__EXEC_PREV__/${EXEC_PREV}}"
bulk_skills="${bulk_skills//__EXEC_RUNNING__/${EXEC_RUNNING}}"

printf '%s\n\n' "${bulk_skills}" | curl -fsS -u "${ES_AUTH}" -o /tmp/aesop-skills-bulk.json -w "    skills bulk: HTTP %{http_code}\n" \
  -X POST "${ES_URL}/_bulk?refresh=true" \
  -H 'Content-Type: application/x-ndjson' --data-binary @-

# Emit a summary.
echo ">>> Summary (counts)"
for idx in \
  .aesop-proposed-skills \
  .aesop-workflow-executions \
  .aesop-discovered-patterns \
  .aesop-discovered-relationships; do
  count=$(curl -fsS -u "${ES_AUTH}" "${ES_URL}/${idx}/_count" | sed -E 's/.*"count":([0-9]+).*/\1/')
  printf "    %-40s %s docs\n" "${idx}" "${count}"
done

echo ">>> Done. Reload the Evaluations app to see seeded data."
