## Context

Elastic Security has mature endpoint detection (Elastic Defend + third-party integrations) and cloud compliance monitoring (Cloud Security Posture — CSPM/KSPM), but no endpoint compliance capability. Meanwhile, the Osquery Manager plugin already deploys osquery to agents, runs live/scheduled queries, and pipes results back to Elasticsearch — it lacks only the compliance-specific framing: benchmark rule definitions, pass/fail evaluation, scoring, and dashboards.

The Cloud Security Posture plugin (`cloudSecurityPosture`) provides a proven data model and UI pattern for compliance: findings with `result.evaluation`, rules with `benchmark.*` metadata, background score aggregation into a scores index, and a dashboard with posture gauges, section breakdowns, and trend charts. We will mirror this data model field-by-field so that a future unified posture view requires only a cross-index data view merge — no schema migration, no runtime transformation.

**Constraints:**
- This is a spike: working E2E code behind a feature flag, not production-merge-ready
- No dependency on or coordination with the CSP team — schema alignment is by convention, not shared code imports
- CIS benchmark content is licensed; starter rules use community/open-source osquery SQL
- Must work across all three platforms (macOS, Windows, Linux) with graceful degradation

**Stakeholders:** Security Solution team, Elastic Defend team (future Endpoint integration), CSP team (future unified posture)

## Goals / Non-Goals

**Goals:**
- Validate the full E2E value chain: rule definition → pack deployment → agent execution → finding ingestion → scoring → dashboard visualization → detection rule generation
- Deliver 30 starter CIS rules (10 per platform) as proof of concept
- Produce a schema-aligned data model that a future CSP unification can consume without migration
- Demonstrate the unique multi-vendor endpoint compliance narrative (compliance posture for agents managed by SentinelOne/CrowdStrike/Defender alongside Elastic Agent)
- Enable a meaningful stakeholder demo within 4 weeks

**Non-Goals:**
- Official CIS certification or licensed benchmark content
- NIST 800-53 / STIG full framework support (framework field structure is included for future use)
- CSP plugin code sharing or runtime integration
- Remediation automation (detecting is enough for the spike; remediation is phase 2)
- Production scalability beyond ~1k hosts (spike validates correctness, not 100k-host scale)
- Custom framework builder UI (API-level support only)

## Decisions

### D1: Host the feature inside the Osquery plugin, not a new plugin

**Choice:** Add a `compliance` module within `x-pack/platform/plugins/shared/osquery/` behind the `endpointComplianceMonitoring` experimental feature flag.

**Alternatives considered:**
- **New standalone plugin**: Cleaner separation but requires new plugin registration, dependency wiring, and slows the spike. Compliance is fundamentally "osquery with an opinion" — it uses the same agent, same Fleet integration, same result ingestion pipeline.
- **CSP plugin extension**: Strongest unification path but creates a hard dependency on the CSP team and conflates cloud-agent (Cloudbeat) concerns with endpoint-agent (osquery) concerns.

**Rationale:** The osquery plugin already has Fleet integration, action services, result ingestion, and scheduled query infrastructure. Compliance reuses all of this. If the spike succeeds and we pursue production, extracting to a dedicated plugin is a straightforward refactor.

### D2: Mirror CSP field names in the findings index, but store independently

**Choice:** The `logs-endpoint_compliance.findings-*` index mapping uses identical field paths to CSP's findings (`result.evaluation`, `rule.benchmark.id`, `rule.benchmark.version`, `rule.benchmark.rule_number`, `rule.section`, `rule.name`, `rule.remediation`, `resource.*`, `host.*`, `agent.*`) but is a completely separate data stream.

**Alternatives considered:**
- **Write to CSP's findings index**: Tightest coupling, enables immediate unified views, but makes us dependent on CSP's index lifecycle, transform, and retention policies. Any CSP schema change breaks us.
- **Completely different schema**: Full independence, but unification later requires ETL or runtime field mappings.

**Rationale:** Field-level alignment gives us the benefits of future unification (a cross-index data view with `logs-cloud_security_posture.findings-*,logs-endpoint_compliance.findings-*` works immediately) without runtime coupling. We own our index lifecycle, ILM, and transforms independently.

### D3: Three-state evaluation aligned with CSP

**Choice:** Findings use `result.evaluation: 'passed' | 'failed' | 'not_applicable'`.

- `passed` — the osquery query returned rows indicating the expected compliant state
- `failed` — the query returned rows indicating non-compliance
- `not_applicable` — the query returned no rows (table not available) or the rule's platform filter excluded this host

**Rationale:** CSP uses `passed | failed`. Adding `not_applicable` (like Wazuh's three-state model) prevents inflating failure counts when a macOS-only check runs against a Linux host. The score formula (`passed / (passed + failed)`) naturally excludes `not_applicable`, matching CSP's `calculatePostureScore()`.

### D4: Compliance rules stored as saved objects, deployed as osquery scheduled packs

**Choice:** Each compliance rule is a saved object (`endpoint-compliance-rule`) containing: osquery SQL, expected result evaluation logic, benchmark metadata, framework mappings, and platform requirements. When a benchmark is enabled, the compliance pack deployment service converts enabled rules into an osquery scheduled pack and syncs it to the Fleet package policy.

**Alternatives considered:**
- **Hardcoded rules in code**: Simplest for a spike but makes it impossible to mute/customize rules
- **Rules only in Fleet integration package**: Follows CSP's Cloudbeat model but requires building a custom Fleet integration package, which is heavyweight for a spike
- **ES documents (not saved objects)**: Would avoid SO migration concerns but loses Kibana's space isolation, RBAC, and import/export

**Rationale:** Saved objects give us mute/unmute, space isolation, and alignment with how CSP stores `csp-rule-template`. The deployment step reuses the existing osquery pack → Fleet policy sync mechanism (`update_global_packs.ts` pattern), so we don't build new Fleet plumbing.

### D5: Background score aggregation task

**Choice:** A Kibana task manager task running every 5 minutes that:
1. Queries latest findings per rule per host (dedup by `rule.id` + `host.id`, latest by `@timestamp`)
2. Aggregates pass/fail counts by benchmark, section, and host
3. Computes `score = passed / (passed + failed) * 100`
4. Writes score documents to `logs-endpoint_compliance.scores-default`

**Alternatives considered:**
- **Real-time aggregation on dashboard load**: Simpler (no background task) but slow for >1k hosts — CSP moved away from this to the background task model
- **ES transforms**: Could replace the task but transforms can't easily handle the muted-rules exclusion logic and custom scoring

**Rationale:** Mirrors CSP's `findings_stats_task.ts` pattern, which is battle-tested. Score documents enable instant dashboard loads and trend charts without expensive aggregation queries.

### D6: Rule evaluation logic — convention-based osquery SQL

**Choice:** Compliance rules follow a convention:
- The SQL query SHALL return **one or more rows** when the check **passes**
- The SQL query SHALL return **zero rows** when the check **fails**
- If the query errors (table not found, permission denied), the finding is `not_applicable`

This is the same convention FleetDM uses for CIS policy queries (`SELECT 1 WHERE <compliant_condition>`).

**Alternatives considered:**
- **Return a status column**: More flexible but requires each rule author to follow a different convention
- **Return raw data + server-side evaluation**: Most flexible (can compare values) but massively more complex — need rule-specific evaluation functions

**Rationale:** The "rows = pass, no rows = fail" convention is industry standard for osquery compliance. FleetDM's entire CIS library uses it. It's simple, composable, and requires zero server-side evaluation logic — the finding evaluator just checks `resultCount > 0`.

### D7: Navigation placement

**Choice:** "Endpoint Compliance" appears under Security > Manage, alongside Endpoints, Policies, Response Actions History. Three sub-pages: Dashboard, Findings, Rules.

**Alternatives considered:**
- **Under Cloud Security Posture**: Logical for a unified posture story but premature coupling
- **Under Osquery**: Technically accurate but buries it — compliance is a security management concern, not a query management concern
- **Top-level Security page**: Too prominent for a spike behind a feature flag

**Rationale:** Manage is where endpoint operations live. This placement signals "endpoint compliance is an operational concern" and sits adjacent to Endpoints and Policies, which is where users already go for endpoint posture.

### D8: Starter CIS rules — 30 rules across 3 platforms

**Choice:** Ship 10 CIS-inspired rules per platform covering high-value checks:

**macOS (CIS macOS 15 Sequoia):**
1. FileVault disk encryption enabled
2. Firewall enabled
3. Auto-updates enabled
4. Screen lock timeout ≤ 5 minutes
5. SSH root login disabled
6. Remote login (SSH) disabled for standard users
7. AirDrop disabled
8. Guest account disabled
9. Bluetooth set to non-discoverable
10. System Integrity Protection enabled

**Windows (CIS Windows 11 Enterprise):**
1. BitLocker drive encryption enabled
2. Windows Firewall enabled (all profiles)
3. Windows Update auto-update enabled
4. Screen lock timeout ≤ 15 minutes
5. Account lockout threshold ≤ 5 attempts
6. Audit policy for logon events enabled
7. Remote Desktop disabled or NLA required
8. UAC enabled and set to prompt
9. Windows Defender real-time protection enabled
10. Minimum password length ≥ 14 characters

**Linux (CIS RHEL 9 / Ubuntu 22.04):**
1. Filesystem permissions on /etc/passwd
2. SSH Protocol version 2 only
3. Firewall (iptables/nftables/firewalld) active
4. Password max age ≤ 365 days
5. Audit daemon (auditd) running
6. Cron directory permissions restricted
7. No world-writable SUID/SGID files
8. IP forwarding disabled
9. Root login restricted via PAM
10. /tmp mounted with noexec

## Risks / Trade-offs

**[CIS licensing]** → Starter rules are "CIS-inspired" using community osquery SQL, not official CIS-certified checks. Rule names reference CIS section numbers for discoverability but do not reproduce copyrighted CIS content. For production, Elastic would pursue CIS SecureSuite Membership.

**[Osquery table availability]** → Virtual tables vary across osquery versions and OS releases. Each rule declares `platform` (darwin/windows/linux) and `min_osquery_version`. The evaluator marks findings as `not_applicable` when the table is unavailable instead of `failed`. Mitigation: validate all 30 rules against the osquery table schema for the current Elastic Agent osquery version.

**[Scale — millions of findings]** → At 100 rules × 10k hosts × 5-minute interval = 288M documents/day if every evaluation is stored. Mitigation: the findings index stores only the **latest** evaluation per (rule, host) pair via an ES transform (similar to CSP's `misconfiguration_latest` alias). Historical data uses ILM with a 7-day hot tier and 30-day warm tier.

**[Fleet pack size limits]** → Deploying 100+ scheduled queries to a single agent increases osquery's memory and CPU usage. Mitigation: stagger evaluation intervals (not all rules run at the same time), cap at 50 concurrent queries per agent, and provide a "lightweight" benchmark profile (Level 1 only, ~30 rules).

**[Feature flag isolation]** → All new code paths are gated behind `endpointComplianceMonitoring` experimental flag. No existing osquery or Security Solution behavior changes when the flag is off. Risk: the flag gate adds conditional branching in route registration and navigation — ensure zero dead code when flag is disabled.

**[Schema drift from CSP]** → We mirror CSP's field names today, but CSP could change their schema independently. Mitigation: document the exact CSP version we aligned with (9.x) and the field mapping. If CSP changes, we adapt our schema in a subsequent release. No runtime dependency means no breaking change.

## Migration Plan

**Deploy:** Feature flag `endpointComplianceMonitoring` is disabled by default. Enable via `kibana.yml` or advanced settings to activate the feature. No migration — fresh indices are created on first use.

**Rollback:** Disable the feature flag. Background task stops, routes return 404, navigation link disappears. Indices remain but receive no new data. Clean removal: delete the indices and saved objects via API.

**Future production path:** If the spike is approved for productionization:
1. Extract compliance module from osquery plugin into a dedicated `endpoint_compliance` plugin
2. Add Fleet integration package for compliance packs (replacing SO-based rule deployment)
3. Pursue CIS SecureSuite Membership for official benchmark content
4. Coordinate with CSP team on shared posture dashboard

## Open Questions

1. **Should compliance findings feed into Risk Score?** — The Entity Analytics risk engine could consume compliance failures as risk inputs (non-compliant host = higher risk). This is a natural extension but out of scope for the spike.

2. **Multi-benchmark overlap** — A single host may be evaluated against multiple benchmarks (CIS macOS + NIST 800-53). How should the overall posture score weight overlapping checks? For the spike: each benchmark scores independently; unified scoring is a product decision.

3. **Agent-less compliance** — Some endpoints don't run Elastic Agent (SentinelOne-only hosts). Could we run compliance checks via SentinelOne's Remote Script Execution and ingest results? This is the unique multi-vendor narrative but technically complex — defer to phase 2.

4. **Prebuilt vs. custom rules ratio** — Should the UI emphasize a curated "enable this benchmark" experience or a "build your own compliance framework" experience? The spike ships both but the curated experience is the happy path for the demo.
