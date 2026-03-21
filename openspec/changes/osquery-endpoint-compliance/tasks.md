## 1. Foundation — Feature Flag, Module Structure, Types

- [ ] 1.1 Add `endpointComplianceMonitoring` to `experimental_features.ts` in the osquery plugin (default: `false`)
- [ ] 1.2 Create directory structure: `server/compliance/` and `public/compliance/` within the osquery plugin
- [ ] 1.3 Define TypeScript types for `ComplianceRule`, `ComplianceFinding`, `ComplianceScore`, `ComplianceBenchmark` in `common/compliance/types.ts`, aligned with the CSP field structure from the finding evaluator spec
- [ ] 1.4 Define Zod schemas for all API request/response bodies in `common/compliance/api_schemas.ts`
- [ ] 1.5 Define constants: index names (`logs-endpoint_compliance.findings`, `logs-endpoint_compliance.scores`), saved object types, API routes, pack naming prefix in `common/compliance/constants.ts`

## 2. Saved Objects — Compliance Rules and Benchmark State

- [ ] 2.1 Register `endpoint-compliance-rule` saved object type in `server/compliance/saved_objects/compliance_rule.ts` with all fields from the rule library spec
- [ ] 2.2 Register `endpoint-compliance-benchmark-state` saved object type for muted rules state
- [ ] 2.3 Wire both SO types into the osquery plugin's `server/saved_objects.ts` registration, gated behind feature flag
- [ ] 2.4 Add saved object migrations scaffolding (version 1.0.0 initial)

## 3. Index Templates, Transforms, Data Views

- [ ] 3.1 Create ES index template for `logs-endpoint_compliance.findings-*` with the full finding document mapping from the evaluator spec
- [ ] 3.2 Create ES index template for `logs-endpoint_compliance.scores-*` with the score document mapping from the scoring engine spec
- [ ] 3.3 Create ILM policies: findings (7d hot, 23d warm, 30d delete), scores (30d hot, 60d warm, 90d delete)
- [ ] 3.4 Create ES transform for latest findings deduplication: source `logs-endpoint_compliance.findings-*` → dest `endpoint_compliance.findings_latest-default`, latest by `@timestamp` per unique key `(rule.id, host.id)`
- [ ] 3.5 Create data views: `logs-endpoint_compliance.findings*` and `logs-endpoint_compliance.scores*` with `@timestamp` time field
- [ ] 3.6 Wire index/transform/data-view initialization into plugin start lifecycle, gated behind feature flag

## 4. Prebuilt CIS Rule Packs (30 Rules)

- [ ] 4.1 Author 10 CIS macOS 15 rules as JSON definitions: FileVault, Firewall, Auto-Updates, Screen Lock, SSH Root Login, Remote Login, AirDrop, Guest Account, Bluetooth, SIP
- [ ] 4.2 Author 10 CIS Windows 11 rules: BitLocker, Windows Firewall, Auto-Updates, Screen Lock, Account Lockout, Audit Policy, Remote Desktop, UAC, Defender, Password Length
- [ ] 4.3 Author 10 CIS Linux rules: /etc/passwd permissions, SSH v2, Firewall active, Password max age, Auditd running, Cron permissions, No world-writable SUID, IP forwarding disabled, Root login PAM, /tmp noexec
- [ ] 4.4 Add NIST 800-53 framework cross-mappings for each rule (CM-6, IA-5, SC-7, etc.)
- [ ] 4.5 Create prebuilt rule installation service: on plugin start, upsert all prebuilt rules as saved objects (skip existing, create missing)
- [ ] 4.6 Validate all 30 SQL queries against osquery table schemas for current Elastic Agent osquery version

## 5. Compliance Rules API

- [ ] 5.1 Implement `GET /api/endpoint_compliance/benchmarks` — list benchmarks aggregated from rules
- [ ] 5.2 Implement `GET /api/endpoint_compliance/rules/_find` — paginated search with filters (benchmark_id, platform, section, level, enabled, tags)
- [ ] 5.3 Implement `GET /api/endpoint_compliance/rules/{id}` — get single rule
- [ ] 5.4 Implement `POST /api/endpoint_compliance/rules` — create custom rule (validate schema)
- [ ] 5.5 Implement `PUT /api/endpoint_compliance/rules/{id}` — update rule
- [ ] 5.6 Implement `DELETE /api/endpoint_compliance/rules/{id}` — delete custom rule (reject prebuilt)
- [ ] 5.7 Implement `POST /api/endpoint_compliance/rules/_bulk_action` — mute/unmute/enable/disable
- [ ] 5.8 Add RBAC: register `endpointCompliance` feature with `read` and `write` sub-feature privileges

## 6. Compliance Pack Deployment

- [ ] 6.1 Implement compliance pack builder: convert enabled rules → osquery scheduled pack format with `compliance-{rule_id}` schedule IDs
- [ ] 6.2 Implement Fleet sync service: sync generated compliance packs to osquery_manager package policies (reuse `update_global_packs.ts` pattern)
- [ ] 6.3 Implement `POST /api/endpoint_compliance/deploy` — deploy benchmark to agent policies
- [ ] 6.4 Handle pack regeneration on rule enable/disable/create/delete
- [ ] 6.5 Add error handling for "no osquery integration installed" case

## 7. Finding Evaluator

- [ ] 7.1 Implement finding evaluator service: subscribe to osquery results with `schedule_id` matching `compliance-*`, evaluate pass/fail/na using row count convention
- [ ] 7.2 Implement finding document builder: construct full finding document with embedded rule metadata, host context, and result evidence
- [ ] 7.3 Wire evaluator to ingest findings into `logs-endpoint_compliance.findings-default` data stream
- [ ] 7.4 Handle edge cases: query timeout, table not found, agent disconnection → `not_applicable`

## 8. Score Aggregation Engine

- [ ] 8.1 Register `endpoint-compliance:score-aggregation` task with Kibana task manager (5-minute interval)
- [ ] 8.2 Implement score computation: query latest findings, exclude muted rules, calculate `passed / (passed + failed) * 100`
- [ ] 8.3 Implement per-benchmark score aggregation with host counts
- [ ] 8.4 Implement per-section score breakdown (top 5 worst sections per benchmark)
- [ ] 8.5 Implement per-host score computation
- [ ] 8.6 Write score documents to `logs-endpoint_compliance.scores-default`
- [ ] 8.7 Gate task registration behind feature flag

## 9. Findings & Stats API

- [ ] 9.1 Implement `GET /api/endpoint_compliance/findings` — query latest findings with filters, pagination, grouping
- [ ] 9.2 Implement `GET /api/endpoint_compliance/stats/{benchmark_id}` — return dashboard data: overall score, section breakdown, trend, worst hosts
- [ ] 9.3 Implement trend data query: score history from scores index for last 24h/7d/30d

## 10. Dashboard UI

- [ ] 10.1 Create `ComplianceDashboardPage` container component with time range selector and benchmark tabs
- [ ] 10.2 Implement `ComplianceScoreGauge` — circular score visualization (mirror CSP's `ComplianceScoreChart` pattern)
- [ ] 10.3 Implement `ComplianceTrendChart` — line chart using EUI/Elastic Charts for score over time
- [ ] 10.4 Implement `BenchmarkCard` — card per benchmark with score, platform icon, rule counts, mini section bars
- [ ] 10.5 Implement `ComplianceBySectionTable` — top 5 worst CIS sections with `ComplianceScoreBar`
- [ ] 10.6 Implement `WorstHostsTable` — 10 lowest-scoring hosts with score, name, OS, last eval time
- [ ] 10.7 Implement empty state: "Enable a compliance benchmark to start monitoring"
- [ ] 10.8 Wire dashboard to stats API with React Query hooks

## 11. Findings Explorer UI

- [ ] 11.1 Create `FindingsExplorerPage` with filter bar (benchmark, section, host, evaluation, level, platform)
- [ ] 11.2 Implement findings data table with columns: rule name, rule number, host name, evaluation badge, section, timestamp
- [ ] 11.3 Implement "Group by Rule" mode: one row per rule with pass rate and host count
- [ ] 11.4 Implement "Group by Host" mode: one row per host with pass rate and rule count
- [ ] 11.5 Implement `FindingDetailFlyout`: rule description, remediation, evidence, framework mappings, host details
- [ ] 11.6 Wire explorer to findings API with pagination and filtering

## 12. Rules Management UI

- [ ] 12.1 Create `RulesManagementPage` with benchmark tabs
- [ ] 12.2 Implement rules data table: rule number, name, section, level, enabled toggle, muted badge
- [ ] 12.3 Implement bulk action toolbar: enable/disable/mute/unmute selected rules
- [ ] 12.4 Implement framework mapping toggle view: show NIST 800-53 control column
- [ ] 12.5 Implement `RuleDetailFlyout`: description, SQL query (syntax highlighted), remediation, framework mappings, pass rate stats
- [ ] 12.6 Wire rules page to rules API

## 13. Navigation & Routing

- [ ] 13.1 Register `/app/security/endpoint_compliance` route group in osquery plugin public, gated behind feature flag
- [ ] 13.2 Register sub-routes: `/dashboard`, `/findings`, `/rules`
- [ ] 13.3 Add "Endpoint Compliance" navigation links under Security > Manage with appropriate icons
- [ ] 13.4 Add breadcrumb configuration for all three pages

## 14. Detection Rule Bridge

- [ ] 14.1 Implement detection rule template generator: compliance rule → threshold detection rule config with MITRE mapping
- [ ] 14.2 Implement "Create Detection Rule" action in finding flyout — creates rule via detection engine API
- [ ] 14.3 Implement `POST /api/endpoint_compliance/rules/_generate_detection_rules` for bulk generation
- [ ] 14.4 Add tag-based deduplication: skip rules with existing `compliance-rule:{rule_id}` tag
- [ ] 14.5 Add MITRE ATT&CK mapping lookup table (check category → technique ID)

## 15. Response Action — Run Compliance Check

- [ ] 15.1 Implement "Run Compliance Check" action handler: resolve host OS → get enabled rules for platform → execute as live osquery batch
- [ ] 15.2 Wire action into the osquery response action framework (`createActionService` pattern)
- [ ] 15.3 Add compliance check results flyout component for inline result display
- [ ] 15.4 Ingest on-demand compliance check results into the findings index

## 16. Testing

- [ ] 16.1 Unit tests for finding evaluator (pass/fail/na logic, edge cases)
- [ ] 16.2 Unit tests for score computation (formula, muted rules exclusion, all-NA case)
- [ ] 16.3 Unit tests for pack builder (rule → pack conversion, platform filtering)
- [ ] 16.4 Unit tests for detection rule template generator (MITRE mapping, tag dedup)
- [ ] 16.5 Unit tests for all API routes (validation, RBAC, error cases)
- [ ] 16.6 Integration test for E2E flow: deploy benchmark → ingest results → compute score → query dashboard data
- [ ] 16.7 API integration tests for CRUD operations on rules, findings, benchmarks

## 17. Validation & Documentation

- [ ] 17.1 Run `node scripts/check_changes.ts` and fix any issues
- [ ] 17.2 Run scoped type check on osquery plugin
- [ ] 17.3 Run eslint on all changed files
- [ ] 17.4 Validate all 30 CIS SQL queries against a real macOS/Windows/Linux endpoint
- [ ] 17.5 Write README.md for the compliance module: architecture, setup, API reference, development guide
