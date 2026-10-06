# Discover ES|QL User Workflows and Acceptance Criteria

This document describes user workflows for the Discover application when using ES|QL queries. Discover uses a profile and extension point architecture that adapts the user experience based on the data being queried. Each profile customizes UI elements like columns, cell renderers, row indicators, and visualizations.

## Table of Contents

- [Overview](#overview)
- [Profile Architecture](#profile-architecture)
- [Logs Profile](#logs-profile)
- [Traces Profile](#traces-profile)
- [Metrics Profile](#metrics-profile)
- [Patterns Profile](#patterns-profile)
- [Security Profile](#security-profile)
- [Coverage Gaps Summary](#coverage-gaps-summary)
- [Test Coverage Report](#test-coverage-report)

---

## Overview

Discover profiles are organized in a three-level hierarchy:

| Level | Purpose | Example |
|-------|---------|---------|
| **Root** | Solution context | Observability, Security, Search |
| **Data Source** | Query/index pattern context | Logs, Traces, Metrics, Patterns |
| **Document** | Individual record context | Log document, Trace document |

Profiles customize the Discover experience through **extension points** such as:

- `getDefaultAppState` - Default columns, row height, chart visibility
- `getCellRenderers` - Custom cell rendering for specific fields
- `getRowIndicatorProvider` - Row-level color indicators
- `getRowAdditionalLeadingControls` - Extra row action buttons
- `getDocViewer` - Flyout customizations and tabs
- `getAppMenu` - Custom menu actions
- `getChartSection` - Custom visualization components

---

## Profile Architecture

### How Profiles Are Resolved

1. **Root Profile**: Determined by solution type (Observability, Security, or Search)
2. **Data Source Profile**: Resolved based on ES|QL query index pattern or data view
3. **Document Profile**: Applied per-record based on document properties

### ES|QL Query Pattern Matching

Profiles extract index patterns from ES|QL queries using the `FROM` clause:

```esql
FROM logs-* | WHERE log.level == "error" | LIMIT 100
```

The index pattern `logs-*` triggers the Logs data source profile.

---

## Logs Profile

### Profile Information

| Property | Value |
|----------|-------|
| Profile ID | `logs-data-source` |
| Solution | Observability |
| Index Patterns | `logs-*`, `logstash-*`, `filebeat-*`, `auditbeat-*`, `winlogbeat-*` |
| ES|QL Support | ✅ Full support |

### Preconditions

- User is in Observability solution context
- ES|QL query targets a logs index pattern (e.g., `FROM logs-*`)
- OR data view matches an allowed logs pattern

### User Workflows

#### Workflow 1: Viewing Log Entries with Level Indicators

**Scenario**: User queries logs and sees color-coded severity levels

1. User enters ES|QL query: `FROM logs-* | LIMIT 100`
2. Results display with row-level color indicators on the left
3. Each row shows a colored bar based on `log.level` value
4. Colors indicate severity: blue (info), yellow (warning), red (error), etc.

#### Workflow 2: Exploring Log Details with Summary Column

**Scenario**: User views condensed log information in a summary column

1. User queries logs data source
2. Summary column displays resource identifiers + log message
3. User can see key context without expanding the row
4. Clicking the row expands to show full document details

#### Workflow 3: Navigating to APM from Service Name

**Scenario**: User clicks on service name to view APM details

1. User queries logs containing `service.name` field
2. Service name cell renders with an icon
3. User clicks on service name
4. User is navigated to APM service details view

#### Workflow 4: Investigating Degraded Documents

**Scenario**: User identifies and investigates data quality issues

1. User queries logs with potential quality issues
2. Degraded docs button appears in row controls
3. User clicks degraded docs button
4. Quality issues panel opens showing field mapping problems

#### Workflow 5: Viewing Stacktraces

**Scenario**: User views stacktrace for error logs

1. User queries logs containing stacktrace data
2. Stacktrace button appears in row controls for applicable logs
3. User clicks stacktrace button
4. Stacktrace panel opens with formatted trace view

#### Workflow 6: Infinite Scroll Pagination

**Scenario**: User scrolls through large result sets

1. User queries logs with many results
2. Initial page loads with first batch of results
3. User scrolls down
4. Additional results load automatically (infinite scroll)
5. No manual pagination controls needed

### Acceptance Criteria

| ID | Description | Extension Point |
|----|-------------|-----------------|
| AC-L001 | Row indicator displays color based on `log.level` field (info=blue, warning=yellow, error=red, critical=red, debug=gray) | `getRowIndicatorProvider` |
| AC-L002 | `log.level` field renders as a colored badge matching severity | `getCellRenderers` |
| AC-L003 | `service.name` cell displays with icon and links to APM service view | `getCellRenderers` |
| AC-L004 | Summary column shows resource identifiers concatenated with log message | `getCellRenderers` |
| AC-L005 | Degraded docs button appears in row leading controls when applicable | `getRowAdditionalLeadingControls` |
| AC-L006 | Stacktrace button appears in row leading controls for logs with stacktrace data | `getRowAdditionalLeadingControls` |
| AC-L007 | Single-page pagination mode (infinite scroll) is active for logs data source | `getDocViewerPaginationMode` |
| AC-L008 | Histogram breaks down by `log.level` field by default | `getDefaultAppState` |
| AC-L009 | Default columns include `@timestamp` and profile-specific columns when `_source` is available | `getDefaultAppState` |
| AC-L010 | Logs Overview tab appears in document flyout for logs data source | `getDocViewer` |
| AC-L011 | Recommended fields section shows log-relevant fields | `getRecommendedFields` |

### Integration Sub-Profiles

The Logs profile includes sub-profiles for specific integrations with customized default columns:

#### Nginx Access Logs (`nginx-access-logs`)

| ID | Description |
|----|-------------|
| AC-L-NGINX-A001 | Profile activates for `logs-nginx.access*` index pattern |
| AC-L-NGINX-A002 | Default columns: `@timestamp`, `url.path`, `http.response.status_code`, `source.ip`, `message` |

#### Nginx Error Logs (`nginx-error-logs`)

| ID | Description |
|----|-------------|
| AC-L-NGINX-E001 | Profile activates for `logs-nginx.error*` index pattern |
| AC-L-NGINX-E002 | Default columns: `@timestamp`, `log.level`, `message` |

#### Apache Error Logs (`apache-error-logs`)

| ID | Description |
|----|-------------|
| AC-L-APACHE001 | Profile activates for `logs-apache.error*` index pattern |
| AC-L-APACHE002 | Default columns: `@timestamp`, `log.level`, `client.ip`, `message` |

#### Kubernetes Container Logs (`kubernetes-container-logs`)

| ID | Description |
|----|-------------|
| AC-L-K8S001 | Profile activates for `logs-kubernetes.container_logs*` index pattern |
| AC-L-K8S002 | Default columns: `@timestamp`, `log.level`, `kubernetes.pod.name`, `kubernetes.namespace`, `orchestrator.cluster.name`, `message` |

#### AWS S3 Access Logs (`aws-s3access-logs`)

| ID | Description |
|----|-------------|
| AC-L-AWS001 | Profile activates for `logs-aws.s3access*` index pattern |
| AC-L-AWS002 | Default columns: `@timestamp`, `aws.s3.bucket.name`, `aws.s3.object.key`, `aws.s3access.operation`, `client.ip`, `message` |

#### System Logs (`system-logs`)

| ID | Description |
|----|-------------|
| AC-L-SYS001 | Profile activates for `logs-system.*` index pattern |
| AC-L-SYS002 | Default columns: `@timestamp`, `log.level`, `process.name`, `host.name`, `message` |

#### Windows Logs (`windows-logs`)

| ID | Description |
|----|-------------|
| AC-L-WIN001 | Profile activates for `logs-windows.*` index pattern |
| AC-L-WIN002 | Default columns: `@timestamp`, `log.level`, `host.name`, `message` |

---

## Traces Profile

### Profile Information

| Property | Value |
|----------|-------|
| Profile ID | `traces-data-source` |
| Solution | Observability |
| Index Patterns | `traces-*` |
| ES|QL Support | ✅ Full support |
| Sub-Profiles | APM Traces, OTel Traces |

### Preconditions

- User is in Observability solution context
- ES|QL query targets a traces index pattern (e.g., `FROM traces-*`)
- Application Performance Monitoring (APM) feature is enabled

### User Workflows

#### Workflow 1: Viewing APM Trace Spans

**Scenario**: User explores APM trace data

1. User enters ES|QL query: `FROM traces-apm-* | LIMIT 100`
2. APM traces sub-profile activates
3. Results display with APM-specific columns: transaction duration, service name, trace ID
4. Custom time series chart shows trace distribution

#### Workflow 2: Viewing OpenTelemetry Traces

**Scenario**: User explores OTel trace data

1. User enters ES|QL query: `FROM traces-otel-* | LIMIT 100`
2. OTel traces sub-profile activates
3. Results display with OTel-specific columns: span kind, status code, OTel duration fields
4. Custom time series chart shows trace distribution

#### Workflow 3: Navigating to Trace Details

**Scenario**: User clicks trace ID to view full trace

1. User views trace results with `trace.id` column
2. User clicks on a trace ID value
3. User is navigated to trace details view in APM

### Acceptance Criteria

| ID | Description | Extension Point |
|----|-------------|-----------------|
| AC-T001 | APM traces sub-profile activates for index patterns containing "traces" AND "apm" (not "otel") | Profile resolution |
| AC-T002 | APM traces display columns: `@timestamp`, `service.name`, `transaction.name`, `transaction.duration.us`, `trace.id`, `span.id` | `getDefaultAppState` |
| AC-T003 | OTel traces sub-profile activates for index patterns containing "traces" AND "otel" (not "apm") | Profile resolution |
| AC-T004 | OTel traces display OTel-specific columns: span kind, status code, OTel duration/name fields | `getDefaultAppState` |
| AC-T005 | Time series chart section displays for traces data source (APM datasource) | `getChartSection` |
| AC-T006 | Time series chart section displays for traces data source (OTel datasource) | `getChartSection` |
| AC-T007 | Summary column displays trace context information | `getCellRenderers` |
| AC-T008 | `service.name` cell links to APM service view | `getCellRenderers` |
| AC-T009 | Custom column header shows traces summary tooltip | `getColumnsConfiguration` |

---

## Metrics Profile

### Profile Information

| Property | Value |
|----------|-------|
| Profile ID | `metrics-data-source` |
| Solution | Observability |
| Index Patterns | `metrics-*` (when using `TS` command) |
| ES|QL Support | ✅ Requires `TS` command |

### Preconditions

- User is in Observability solution context
- ES|QL query uses the `TS` (Time Series) command (**NOT** `FROM`)
- Supported commands: `TS`, `LIMIT`, `SORT`, `WHERE`

### User Workflows

#### Workflow 1: Querying Time Series Metrics

**Scenario**: User queries metrics using time series command

1. User enters ES|QL query: `TS metrics-* | LIMIT 100`
2. Metrics profile activates (only with `TS` command)
3. MetricsGrid visualization replaces standard histogram
4. Multi-dimensional breakdown is available

#### Workflow 2: Profile Does NOT Activate with FROM

**Scenario**: User uses FROM command on metrics index

1. User enters ES|QL query: `FROM metrics-* | LIMIT 100`
2. Metrics profile does NOT activate (requires `TS` command)
3. Standard Discover view displays with default histogram

### Acceptance Criteria

| ID | Description | Extension Point |
|----|-------------|-----------------|
| AC-M001 | Profile activates ONLY when ES|QL query uses `TS` command | Profile resolution |
| AC-M002 | Profile does NOT activate when ES|QL query uses `FROM` command on metrics index | Profile resolution |
| AC-M003 | `MetricsGrid` visualization replaces standard histogram chart | `getChartSection` |
| AC-M004 | Multi-dimensional breakdown field selection is available | `getDefaultAppState` |
| AC-M005 | Supported ES|QL commands: `TS`, `LIMIT`, `SORT`, `WHERE` | Profile resolution |
| AC-M006 | Unsupported ES|QL commands (e.g., `STATS`, `EVAL`) prevent profile activation | Profile resolution |

---

## Patterns Profile

### Profile Information

| Property | Value |
|----------|-------|
| Profile ID | `patterns-data-source` |
| Solution | Any (Default) |
| Index Patterns | Any |
| ES|QL Support | ✅ Requires `CATEGORIZE` function |

### Preconditions

- ES|QL query contains the `CATEGORIZE` function
- Query produces pattern columns in results

### User Workflows

#### Workflow 1: Categorizing Log Patterns

**Scenario**: User uses CATEGORIZE to find log patterns

1. User enters ES|QL query: `FROM logs-* | STATS count=COUNT() BY pattern=CATEGORIZE(message)`
2. Patterns profile activates due to `CATEGORIZE` function
3. Pattern column displays tokens as styled badges
4. Count column shows frequency of each pattern

#### Workflow 2: Viewing Matching Documents

**Scenario**: User explores documents matching a pattern

1. User views pattern results with token badges
2. User clicks on a pattern cell
3. Cell action "View matching results" appears
4. User clicks action
5. New Discover tab opens with `MATCH` query for that pattern

#### Workflow 3: Viewing Pattern Details

**Scenario**: User examines pattern tokens and regex

1. User expands a pattern row
2. Details view shows "Tokens" section with extracted tokens
3. Details view shows "Regex" section with pattern regex

### Acceptance Criteria

| ID | Description | Extension Point |
|----|-------------|-----------------|
| AC-P001 | Profile activates when ES|QL query contains `CATEGORIZE` function | Profile resolution |
| AC-P002 | Profile activates only for ES|QL data sources (not data views) | Profile resolution |
| AC-P003 | Pattern column displays extracted tokens as styled badges | `getCellRenderers` |
| AC-P004 | "View matching results" cell action appears for pattern cells | `getAdditionalCellActions` |
| AC-P005 | "View matching results" action opens new Discover tab with `MATCH` query | `getAdditionalCellActions` |
| AC-P006 | Default columns include `Count` (150px width) and `Pattern` | `getDefaultAppState` |
| AC-P007 | Pattern details view shows "Tokens" section | `getDocViewer` |
| AC-P008 | Pattern details view shows "Regex" section | `getDocViewer` |

---

## Security Profile

### Profile Information

| Property | Value |
|----------|-------|
| Profile ID | `security-root-profile` |
| Solution | Security |
| Index Patterns | `.alerts-security.alerts-*` (for alerts), any (for events) |
| ES|QL Support | ✅ Full support |

### Preconditions

- User is in Security solution context
- For alert-specific features: ES|QL query targets `.alerts-security.alerts-*` index

### User Workflows

#### Workflow 1: Viewing Security Alerts

**Scenario**: User queries security alerts

1. User enters ES|QL query: `FROM .alerts-security.alerts-* | LIMIT 100`
2. Security alerts sub-profile activates
3. Default columns show: timestamp, workflow_status, message, event.category, event.action, host.name, source.ip, destination.ip, user.name
4. Row indicators show warning color for alerts
5. Histogram breaks down by `kibana.alert.workflow_status`

#### Workflow 2: Managing Alert Workflow Status

**Scenario**: User views alert workflow status

1. User queries security alerts
2. `kibana.alert.workflow_status` column displays with custom cell renderer
3. Status values are styled distinctly (open, acknowledged, closed)

#### Workflow 3: Viewing Security Events

**Scenario**: User queries general security events (not alerts)

1. User enters ES|QL query: `FROM logs-* | WHERE event.category == "authentication"`
2. Security events display with light-colored row indicators
3. Standard event columns are shown

### Acceptance Criteria

| ID | Description | Extension Point |
|----|-------------|-----------------|
| AC-S001 | Security root profile activates when solution type is Security | Profile resolution |
| AC-S002 | Alerts sub-context activates for `.alerts-security.alerts-*` index pattern | Profile resolution |
| AC-S003 | `kibana.alert.workflow_status` renders with custom cell for alerts index | `getCellRenderers` |
| AC-S004 | Row indicators show warning color for security alerts | `getRowIndicatorProvider` |
| AC-S005 | Row indicators show light color for security events (non-alerts) | `getRowIndicatorProvider` |
| AC-S006 | Default columns for alerts: `@timestamp`, `kibana.alert.workflow_status`, `message`, `event.category`, `event.action`, `host.name`, `source.ip`, `destination.ip`, `user.name` | `getDefaultAppState` |
| AC-S007 | Histogram breaks down by `kibana.alert.workflow_status` for alerts | `getDefaultAppState` |

---

## Coverage Gaps Summary

Based on analysis of existing test files, the following gaps have been identified:

### Critical Gaps (No Tests)

| Profile/Feature | Gap Description | Priority |
|-----------------|-----------------|----------|
| **Patterns Profile** | No unit or functional tests exist for the entire profile | 🔴 Critical |
| **Patterns Profile** | `CATEGORIZE` query detection untested | 🔴 Critical |
| **Patterns Profile** | Pattern cell renderer untested | 🔴 Critical |
| **Patterns Profile** | "View matching results" cell action untested | 🔴 Critical |

### High Priority Gaps

| Profile/Feature | Gap Description | Priority |
|-----------------|-----------------|----------|
| **Metrics Profile** | No functional tests for `MetricsGrid` integration | 🟠 High |
| **Traces (APM/OTel)** | No tests for APM vs OTel sub-profile distinction | 🟠 High |
| **Traces (APM/OTel)** | No tests for `getChartSection` implementation | 🟠 High |
| **Security Profile** | No functional tests for cell renderer integration | 🟠 High |
| **Row Indicators** | Platform FTR test file is empty (has TODO comment) | 🟠 High |

### Medium Priority Gaps

| Profile/Feature | Gap Description | Priority |
|-----------------|-----------------|----------|
| **Logs Profile** | `getColumnsConfiguration` extension untested | 🟡 Medium |
| **Traces Profile** | Custom column header tooltip untested | 🟡 Medium |
| **All Profiles** | ES|QL query modification and profile persistence untested | 🟡 Medium |
| **All Profiles** | Complex ES|QL queries with multiple pipes untested | 🟡 Medium |

### Extension Point Coverage Matrix

| Extension Point | Unit Tests | Functional Tests |
|-----------------|------------|------------------|
| `getDefaultAppState` | ✅ Logs, Security | ✅ Platform FTR |
| `getCellRenderers` | ✅ Logs | ✅ Observability Serverless |
| `getRowIndicatorProvider` | ✅ Logs, Security | ⚠️ Observability only (Platform empty) |
| `getRowAdditionalLeadingControls` | ✅ Logs | ❌ None |
| `getDocViewerPaginationMode` | ❌ None | ✅ Observability Serverless |
| `getColumnsConfiguration` | ✅ Logs, Traces | ❌ None |
| `getRecommendedFields` | ❌ None | ✅ Observability Serverless |
| `getChartSection` | ❌ None (Metrics, Traces) | ❌ None |
| `getAdditionalCellActions` | ❌ None (Patterns) | ✅ Platform FTR (example only) |
| `getDocViewer` | ❌ None | ✅ Observability Serverless |

---

## Test Coverage Report

> **Note**: Run `node scripts/analyze_discover_test_coverage.js` to generate an updated coverage report.

The coverage report maps each acceptance criteria to existing tests and identifies coverage status:

- ✅ **Covered**: Exact keyword match found in test descriptions
- ⚠️ **Partial**: 2+ keyword matches found but not exact match
- ❌ **Not Covered**: Fewer than 2 keyword matches found

### Logs Profile Coverage

| AC ID | Description | Unit Test | FTR Test | Status |
|-------|-------------|-----------|----------|--------|
| AC-L001 | Row indicator color by log.level | `profile.test.ts` | `_row_indicators.ts` | ✅ |
| AC-L002 | log.level badge cell rendering | `profile.test.ts` | `_cell_renderers.ts` | ✅ |
| AC-L003 | service.name APM linking | `profile.test.ts` | `_cell_renderers.ts` | ✅ |
| AC-L004 | Summary column rendering | `profile.test.ts` | `_cell_renderers.ts` | ✅ |
| AC-L005 | Degraded docs button | `profile.test.ts` | - | ⚠️ |
| AC-L006 | Stacktrace button | `profile.test.ts` | - | ⚠️ |
| AC-L007 | Single-page pagination | - | `_pagination.ts` | ⚠️ |
| AC-L008 | Histogram breakdown by log.level | `profile.test.ts` | - | ⚠️ |
| AC-L009 | Default columns configuration | `profile.test.ts` | `_get_default_app_state.ts` | ✅ |
| AC-L010 | Logs Overview tab | - | `_logs_overview.ts` | ⚠️ |
| AC-L011 | Recommended fields section | - | `_recommended_fields.ts` | ⚠️ |

### Traces Profile Coverage

| AC ID | Description | Unit Test | FTR Test | Status |
|-------|-------------|-----------|----------|--------|
| AC-T001 | APM sub-profile activation | - | - | ❌ |
| AC-T002 | APM columns configuration | - | - | ❌ |
| AC-T003 | OTel sub-profile activation | - | - | ❌ |
| AC-T004 | OTel columns configuration | - | - | ❌ |
| AC-T005 | APM chart section | - | - | ❌ |
| AC-T006 | OTel chart section | - | - | ❌ |
| AC-T007 | Summary column rendering | `profile.test.ts` | - | ⚠️ |
| AC-T008 | service.name APM linking | - | - | ❌ |
| AC-T009 | Custom column header tooltip | - | - | ❌ |

### Metrics Profile Coverage

| AC ID | Description | Unit Test | FTR Test | Status |
|-------|-------------|-----------|----------|--------|
| AC-M001 | TS command activation | `profile.test.ts` | - | ⚠️ |
| AC-M002 | FROM command non-activation | `profile.test.ts` | - | ⚠️ |
| AC-M003 | MetricsGrid visualization | - | - | ❌ |
| AC-M004 | Multi-dimensional breakdown | - | - | ❌ |
| AC-M005 | Supported commands validation | `profile.test.ts` | - | ⚠️ |
| AC-M006 | Unsupported commands rejection | `profile.test.ts` | - | ⚠️ |

### Patterns Profile Coverage

| AC ID | Description | Unit Test | FTR Test | Status |
|-------|-------------|-----------|----------|--------|
| AC-P001 | CATEGORIZE activation | - | - | ❌ |
| AC-P002 | ES|QL-only data source | - | - | ❌ |
| AC-P003 | Token badge rendering | - | - | ❌ |
| AC-P004 | View matching results action | - | - | ❌ |
| AC-P005 | MATCH query generation | - | - | ❌ |
| AC-P006 | Default columns | - | - | ❌ |
| AC-P007 | Tokens detail section | - | - | ❌ |
| AC-P008 | Regex detail section | - | - | ❌ |

### Security Profile Coverage

| AC ID | Description | Unit Test | FTR Test | Status |
|-------|-------------|-----------|----------|--------|
| AC-S001 | Security root profile activation | - | - | ❌ |
| AC-S002 | Alerts sub-context activation | `accessors.test.ts` | - | ⚠️ |
| AC-S003 | workflow_status cell renderer | `accessors.test.ts` | - | ⚠️ |
| AC-S004 | Warning color for alerts | `accessors.test.ts` | - | ⚠️ |
| AC-S005 | Light color for events | `accessors.test.ts` | - | ⚠️ |
| AC-S006 | Default alert columns | `accessors.test.ts` | - | ⚠️ |
| AC-S007 | Histogram breakdown by status | `accessors.test.ts` | - | ⚠️ |

---

## Appendix: Running Coverage Analysis

To regenerate the test coverage report:

```bash
# From Kibana root directory
npx ts-node --esm scripts/analyze_discover_test_coverage.ts

# Output options
npx ts-node --esm scripts/analyze_discover_test_coverage.ts --output markdown  # Default
npx ts-node --esm scripts/analyze_discover_test_coverage.ts --output json      # JSON format
npx ts-node --esm scripts/analyze_discover_test_coverage.ts --verbose          # Show all matches
```

The script parses test files using AST analysis to extract `describe` and `it` block descriptions, then matches them against acceptance criteria keywords using weighted scoring.
