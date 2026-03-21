## Why

Elastic has endpoint compliance monitoring for **cloud infrastructure** (CSPM/KSPM via Cloud Security Posture) but **nothing for endpoints**. Customers running Elastic Agent with osquery can already execute arbitrary SQL against their fleet, yet there is no framework to aggregate those results into compliance scores, map them to CIS/NIST benchmarks, or visualize posture trends. This is a gap competitors exploit — FleetDM charges premium for CIS on macOS/Windows (no Linux), Wazuh offers SCA with multi-framework mapping, and Zercurity validated the osquery-compliance concept before shutting down in 2023.

The opportunity is unique to Elastic: we are the **only platform** that can combine osquery-based endpoint compliance with XDR-grade detection, multi-vendor endpoint support (SentinelOne, CrowdStrike, Defender), and cloud compliance — delivering a unified posture view no competitor offers. Building this as a spike validates the full E2E value chain and gives stakeholders a working demo to assess product-market fit.

## What Changes

- **New compliance rule library**: CIS benchmark rules for macOS, Windows, and Linux expressed as osquery SQL queries, with metadata mapping each rule to CIS section/level and optionally to NIST 800-53 controls
- **New findings data model**: `logs-endpoint_compliance.findings-*` index with a schema deliberately aligned with CSP's `CspFinding` structure (`result.evaluation`, `rule.benchmark.*`, `rule.section`, `rule.frameworks[]`) to enable future unified posture views without the CSP plugin being a dependency
- **New scores data model**: `logs-endpoint_compliance.scores-*` index populated by a background task that aggregates pass/fail/na findings into per-benchmark, per-host, and per-section compliance scores
- **New Endpoint Compliance Dashboard**: posture score gauge, benchmark cards, worst-performing CIS sections table, compliance trend chart, and per-host drill-down — following the same component patterns as CSP's dashboard
- **New Findings Explorer**: filterable table (benchmark, section, host, evaluation) with remediation guidance per finding
- **New Compliance Rules Management**: browse rules by benchmark, enable/mute rules (reusing CSP's muted-rules pattern), view framework cross-mappings
- **Compliance pack deployment**: compliance rules are converted to osquery scheduled packs and deployed to agents via Fleet package policy, using the existing osquery manager integration infrastructure
- **Detection rule bridge**: failed compliance findings can auto-generate threshold detection rules tagged with compliance metadata
- **Response action integration**: "Run Compliance Check" as an osquery response action for on-demand verification during investigations
- **Security Solution navigation**: new "Endpoint Compliance" section under Manage, with Dashboard, Findings, and Rules pages

## Capabilities

### New Capabilities

- `compliance-rule-library`: Compliance rule definitions (CIS/NIST benchmark rules as osquery SQL), rule metadata schema, framework cross-mapping, and prebuilt rule packs for macOS/Windows/Linux
- `compliance-finding-evaluator`: Service that takes raw osquery scheduled query results, evaluates pass/fail/not_applicable against rule expectations, and writes structured findings to the findings index
- `compliance-scoring-engine`: Background task that periodically aggregates findings into compliance scores (per-benchmark, per-section, per-host, overall) and writes to the scores index; includes trend computation
- `compliance-dashboard`: Kibana UI pages — posture dashboard with score visualization, findings explorer with filtering/grouping, and rules management with mute/unmute capability
- `compliance-pack-deployment`: Service that converts enabled compliance rules into osquery scheduled packs and syncs them to Fleet package policies on target agents
- `compliance-detection-bridge`: Utility to generate Security detection rules from compliance failures, with appropriate MITRE ATT&CK mapping and compliance-specific tags

### Modified Capabilities

_(none — this is a new feature with no existing specs to modify)_

## Impact

### Code

- **New plugin or sub-feature**: The spike will live within the existing osquery plugin (`x-pack/platform/plugins/shared/osquery/`) as a new `compliance` module, gated behind an experimental feature flag `endpointComplianceMonitoring`. This avoids a new plugin registration while keeping code isolated.
- **Osquery plugin server**: New routes (`/api/endpoint_compliance/*`), new saved object types (`endpoint-compliance-rule`, `endpoint-compliance-benchmark-state`), new background task for score aggregation, new index templates for findings and scores
- **Osquery plugin public**: New route pages (dashboard, findings, rules), new React components, new navigation links
- **Security Solution**: Minimal touch — add navigation link to Endpoint Compliance under Manage, add compliance score badge to endpoint host details flyout (optional in spike)

### APIs

- `GET /api/endpoint_compliance/benchmarks` — list available benchmarks
- `GET /api/endpoint_compliance/rules/_find` — search compliance rules with filtering
- `POST /api/endpoint_compliance/rules/_bulk_action` — mute/unmute rules
- `GET /api/endpoint_compliance/findings` — query compliance findings
- `GET /api/endpoint_compliance/stats/{benchmark_id}` — compliance dashboard data (scores, section breakdown, trends)
- `POST /api/endpoint_compliance/deploy` — deploy compliance pack to agent policies

### Data

- New index: `logs-endpoint_compliance.findings-default` (findings data stream)
- New index: `logs-endpoint_compliance.scores-default` (aggregated scores data stream)
- New transform: latest findings deduplication (similar to CSP's misconfiguration_latest pattern)
- New saved objects: `endpoint-compliance-rule` (rule definitions), `endpoint-compliance-benchmark-state` (muted rules state)

### Dependencies

- **Existing**: osquery plugin (host), Fleet (agent/pack management), Security Solution (navigation), taskManager (background scoring), data/dataViews (findings data view)
- **No new external dependencies**: all compliance checks run via osquery tables already available on Elastic Agent
- **Schema alignment**: finding and score index mappings deliberately mirror CSP's field structure (`result.evaluation`, `rule.benchmark.*`, `rule.section`) so future unification is a data view merge, not a schema migration

### Risks

- CIS benchmark content is not freely redistributable — starter rules will use community/open-source query packs; official CIS certification is a future commercial decision
- Osquery virtual table availability varies across OS versions — each rule must declare platform requirements and gracefully handle `not_applicable`
- Scale at 100+ rules × 10k+ hosts produces millions of findings per evaluation cycle — the deduplication transform and score aggregation task are critical path for performance
