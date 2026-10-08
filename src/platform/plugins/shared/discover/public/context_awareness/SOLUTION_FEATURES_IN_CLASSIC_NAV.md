# Solution features in Classic navigation

This document describes which Observability (logs, traces) and Security features
Discover surfaces, **from which profile they originate**, and the **exact conditions**
under which each one resolves.

## Navigation modes and the solution type

Root profiles translate the active `solutionNavId` into a `SolutionType`
(`profiles/root_profile.ts`), which every lower-level profile reads from
`rootContext.solutionType`:

| `solutionNavId` | Root profile (`profile_providers/…`) | `SolutionType` |
| --- | --- | --- |
| `oblt` | `observability/observability_root_profile` | `Observability` |
| `security` | `security/security_root_profile` | `Security` |
| `es` | `common/search_root_profile` | `Search` |
| _absent_ (Classic) | `common/classic_nav_root_profile` | `Default` |

**Classic navigation resolves to `SolutionType.Default`.** Enabling solution
features in Classic therefore means each data-source / document profile additionally
accepts `SolutionType.Default` in its `resolve` gate, and then falls back to
**data-based conditions** (index pattern and/or document shape) to decide whether to
match. Solution navigations (`Observability`, `Security`) are unaffected — their
gates already accepted their own `SolutionType`.

This `Default` acceptance is also gated by an **opt-out setting** — see
[Opt-out setting](#opt-out-setting).

`SolutionType.Search` exists specifically so that Search navigation does **not**
inherit `Default` behavior — without `search_root_profile`, Search would fall through
to the default context and pick up every Classic feature below. See
[Search: deliberate exclusion](#search-deliberate-exclusion).

## Resolution precedence

Each level resolves **first match wins**, in registration order
(`profile_providers/register_profile_providers.ts`):

- **Root order:** `example` → `example-solution-view` → `classic-nav` → `search` →
  `security` → `observability`.
- **Data source order (relevant part):** … → `sparkline` →
  **`security-data-source`** → `observability-traces` (×N) → `observability-logs`
  (×N).

Because the Security data source profile is registered **before** the Observability
ones, in Classic a source is offered to Security first. Security only claims it if it
passes the [Security data conditions](#security); otherwise a logs/traces source
falls through to its Observability profile.

---

## Observability — Logs

Origin: `profile_providers/observability/logs_data_source_profile` and
`profile_providers/observability/log_document_profile`.

### Data source — `observability-logs-data-source-profile`

`resolve` matches when **both** hold (`logs_data_source_profile/profile.ts`):

- `rootContext.solutionType` is `Observability` — the base profile does **not** run in
  Classic (`Default`); the Classic logs path is the integration sub-profiles below; and
- `isLogsIndexPattern(extractIndexPatternFrom(params))` is true.

`isLogsIndexPattern` (`@kbn/discover-utils` `logs/logs_context_service.ts`) does a
**whole-token** match of the index pattern (data view title, or the ES|QL `FROM`
target) against the base words
`log, logs, logstash, auditbeat, filebeat, winlogbeat`, plus — when the
`logsDataAccess` plugin is available — the deployment's configured log sources
(`observability:logSources`). A token boundary is start/end, a word boundary, `_`, `:`
or `,`; e.g. `logs-*`, `logs-foo.bar-default`, `filebeat-*` match; `metrics-*`,
`mylogs-*` do not. Because this profile is Observability-only, that
`observability:logSources` extension is **not** part of Classic logs detection.

Features contributed (all apply once the profile matches, except where noted):

| Feature | Accessor | Extra condition |
| --- | --- | --- |
| Log-level badge | `getCellRenderers` | field is `log.level` / `log_level` (+ `.keyword`) |
| Service-name badge (tech icon + filter actions) | `getCellRenderers` | field is `service.name` / `service_name` (+ `.keyword`); icon from `resource.attributes.telemetry.sdk.language`, else `agent.name` |
| Summary column | `getCellRenderers` | the `_source` column |
| Log-level row coloring | `getRowIndicatorProvider` | data view has a `log.level` / `log_level` field (else no indicator column) |
| Degraded-document control | `getRowAdditionalLeadingControls` | enabled in data-view mode always; in ES\|QL only if the query has `METADATA _ignored`. "Degraded" state shows only when the row's raw hit carries `_ignored` or `ignored_field_values` |
| Stacktrace control | `getRowAdditionalLeadingControls` | row's document has any of `error.stack_trace`, `error.exception.stacktrace.abs_path`, `error.log.stacktrace.abs_path` |
| Single-page pagination | `getPaginationConfig` | — |
| Summary column header + tooltip | `getColumnsConfiguration` | the `_source` column |
| Recommended fields | `getRecommendedFields` | surfaces `event.dataset, host.name, log.level, message, service.name` |
| Deep-analysis playbook | `getDeepAnalysisPlaybook` | AI analysis shape `logs` |

#### Integration sub-profiles

`logs_data_source_profile/sub_profiles/integration_logs.ts` extends the base logs
profile per integration. Each sub-profile's `resolve` (`sub_profiles/create_resolve.ts`)
adds a solution gate — `Observability | Default`, or `Observability`-only for integrations
that opt out of Classic via `enabledInClassicNav: false` — and then requires the index
pattern to match the integration's **base pattern** (whole-string regex). In Classic these
integration sub-profiles are the **only** logs activation path — detection is limited to
this fixed list, with no `observability:logSources` extension. When it matches it
overrides the default columns (and, for some, recommended fields):

| Base index pattern | Default columns |
| --- | --- |
| `logs-apache.error` | `log.level`, `client.ip`, `message` |
| `logs-aws.s3access` | `aws.s3.bucket.name`, `aws.s3.object.key`, `aws.s3access.operation`, `client.ip`, `message` |
| `logs-kubernetes.container_logs` | `log.level`, `kubernetes.pod.name`, `kubernetes.namespace`, `orchestrator.cluster.name`, `message` |
| `logs-nginx.access` | `url.path`, `http.response.status_code`, `client.ip`, `host.name`, `message` |
| `logs-nginx.error` | `log.level`, `message` |
| `logs-system` | `log.level`, `process.name`, `host.name`, `message` |
| `logs-windows` | `log.level`, `host.name`, `message` |

> `logs-windows` is **Observability-navigation only** (`enabledInClassicNav: false`): Windows
> logs are also Security-relevant, so Classic must not auto-activate the Observability logs
> profile for them.

### Document — `observability-log-document-profile`

`resolve` matches when **all** hold (`log_document_profile/profile.tsx`):

- `rootContext.solutionType` is `Observability` **or** `Default`;
- in `Default` (Classic) **only**, the data source already resolved to
  `DataSourceCategory.Logs` — i.e. a curated integration claimed the source. This keeps
  ambiguous sources (`logs-*`, `audit-logs`, `filebeat-*`) on the default flyout in Classic,
  mirroring the data source profile; `Observability` navigation has no such restriction; and
- the record is a log record — **any** of:
  - `data_stream.type` includes `logs`;
  - the record has any non-null field with a `log.` prefix;
  - any of the record's `_index` values passes `isLogsIndexPattern`;
  - `stream.name` equals `logs` or starts with `logs.`.

Contributes the **Log overview** doc-viewer tab (`doc_view_logs_overview`, order 0).

---

## Observability — Traces

Origin: `profile_providers/observability/traces_data_source_profile` and
`profile_providers/observability/traces_document_profile`. Both are
`restrictedToProductFeature: TRACES_PRODUCT_FEATURE_ID` — gated by serverless product
tier as well as the conditions below.

### Data source — `observability-traces-data-source-profile`

`resolve` matches when **all** hold (`traces_data_source_profile/profile.ts`):

- `rootContext.solutionType` is `Observability` **or** `Default`;
- `isTracesIndexPattern(extractIndexPatternFrom(params))` is true; and
- the source is a data view, **or** a valid non-transformational ES|QL query.

`isTracesIndexPattern` (`@kbn/discover-utils` `traces/traces_context_service.ts`)
whole-token matches against `trace, traces`, plus the configured APM `transaction` /
`span` index patterns when `apmSourcesAccess` is available. E.g. `traces-*`,
`traces-apm*` match; `apm-*` only matches if literally configured as an APM index.

| Feature | Accessor | Notes |
| --- | --- | --- |
| RED metrics chart (Rate / Errors / Duration) | `getChartSectionConfiguration` | replaces the default histogram (`replaceDefaultChart: true`); no field requirement beyond the profile matching |
| Trace default columns + single-line rows | `getDefaultAppState` | `@timestamp, service.name, transaction.name, span.name, transaction.duration.us, span.duration.us, event.outcome`; `rowHeight: 1` |
| Trace summary + service badge | `getCellRenderers` | `_source` → trace summary; `service.name` → service badge |
| Deep-analysis playbook | `getDeepAnalysisPlaybook` | OTel vs APM/ECS variant chosen by the columns present |

### Document — `observability-traces-document-profile`

`resolve` matches when **both** hold
(`traces_document_profile/document_profile/profile.ts`):

- `rootContext.solutionType` is `Observability` **or** `Default`; and
- the record is a trace document — it has a `trace.id` **and** (any `_index` passes
  `isTracesIndexPattern` **or** `data_stream.type` includes `traces`).

Doc-viewer tabs:

| Tab (id) | Condition |
| --- | --- |
| **Overview** (`doc_view_obs_traces_overview`, order 0) | always, for a trace document (includes the waterfall) |
| **GenAI** — Technical Preview (`doc_view_obs_traces_genai`, order 5) | the trace document also has a GenAI field: a flattened key matching `/(^|\.)gen[_.]ai[._]/` with a non-null value (e.g. `gen_ai.*`, `attributes.gen_ai.*`) |

---

## Security

Origin: `profile_providers/security`. The Security root profile
(`security/security_root_profile/profile.tsx`) is now **identity only** — it matches
`solutionNavId === 'security'` and sets `SolutionType.Security` with an empty
`profile`. All behavior moved down to the **data source** and **document** levels so
it can resolve from the data in Classic, not just from Security navigation.

### Data source — `security-data-source-profile`

`resolve` (`security/security_data_source_profile/profile.tsx`):

- `rootContext.solutionType` must be `Security` **or** `Default`; otherwise no match.
- In **`Security`** navigation it matches **any** data source (greedy — this
  preserves the pre-existing Security-solution behavior).
- In **`Default`** (Classic) it matches **only** when the source is recognized as
  Security: `isSecurityDataViewId(dataView?.id)` **or**
  `containsOnlySecuritySourcePatterns(extractIndexPatternFrom(params))`.

On match it sets `DataSourceCategory.Security`.

`isSecurityDataViewId` — the data view's saved-object id starts with one of
(`security_data_source_profile/is_security_data_source.ts`):
`security-solution-`, `security_solution_cdr_latest_misconfigurations`,
`security_solution_cdr_latest_vulnerabilities`, `cloud_security_posture-`.

`containsOnlySecuritySourcePatterns` — the index pattern is split on `,`; each part
is trimmed; empty parts and exclusions (leading `-`) are dropped; the result must be
**non-empty and every remaining part must be a Security source**. Each part is first
normalized (strip a `remote_cluster:` prefix, strip a `::selector` suffix, strip a
leading `.ds-`) and then tested against:

```
/^(?:\.internal)?\.alerts-security\.alerts-/
/^\.preview\.alerts-security\.alerts-/
/^(?:\.internal)?\.alerts-security\.attack\.discovery\.alerts-/
/^(?:\.internal)?\.adhoc\.alerts-security\.attack\.discovery\.alerts-/
/^\.siem-signals-/
/^logs-endpoint\.events\./
/^logs-endpoint\.alerts-/
/^endgame-/
/^logs-cloud_defend\./
/^logs-ti_/
/^logs-cloud_security_posture\.(?:findings|findings_latest|vulnerabilities|vulnerabilities_latest)-/
/^security_solution-.*\.(?:misconfiguration_latest|vulnerability_latest)$/
/^logs-crowdstrike\.(?:alert|falcon|fdr)-/
/^logs-sentinel_one\.(?:activity|alert)-/
/^logs-m365_defender\.(?:alert|event)-/
```

The **"every part must be Security"** rule is what prevents a mixed query (Security +
non-Security) from being claimed by Security in Classic.

Features contributed:

| Feature | Accessor | Extra condition |
| --- | --- | --- |
| Security entity cell renderers | `getCellRenderers` | the (data view / ES\|QL) index pattern **includes `.alerts-security.alerts-`**. Then replaces renderers for `ALLOWED_CELL_RENDER_FIELDS` (`kibana.alert.workflow_status`, `kibana.alert.rule.name`, `signal.rule.name`, `host.name`, `host.hostname`, `user.name`) and every `ip`-typed field, using the `security-solution-cell-renderer` feature (from the `discoverShared` registry — requires the Security Solution plugin) |
| Alert vs. event row coloring | `getRowIndicatorProvider` | applies to **any** matched Security source; each row colored by `getAlertEventRowIndicator` — `event.kind === 'signal'` → "alert", otherwise "event" |
| Security default columns + breakdown | `getDefaultAppState` | the index pattern **includes `.alerts-security.alerts-`**; sets alert columns and `kibana.alert.workflow_status` breakdown |

> Note the split: the **row indicator** applies to any recognized Security data,
> while the **cell renderers** and **default columns** additionally require the
> alerts indices (`.alerts-security.alerts-`).

### Document — `security-document-profile` / `enhanced-security-document-profile`

`resolve` keys off the **data source category**, not the solution type
(`security/security_document_profile/profile.tsx`): it matches when
`dataSourceContext.category === DataSourceCategory.Security`. This is why the Security
flyout resolves identically in Security navigation and in Classic — it follows
whichever data source profile set the `Security` category.

The enhanced document profile (`security/security_profile_providers.tsx`, registered
before the base one) selects the overview tab by document type, using the helpers in
`security/utils/is_alert_document.ts`:

| Tab (id) | Condition |
| --- | --- |
| **Alert Overview** (`doc_view_alerts_overview`) | `isAlertDocument`: `event.kind === 'signal'`, and not an event, and not an attack |
| **Event Overview** (`doc_view_alerts_overview`, alt. title) | `isEventDocument`: `event.kind` is present and `!== 'signal'` |
| **Attack Overview** (`doc_view_attack_overview`) | `isAttackDocument`: `event.kind === 'signal'` **and** `kibana.alert.rule.rule_type_id` is `attack-discovery` or `attack_discovery_ad_hoc_rule_type_id` |
| **Indicator (IOC) Overview** (`doc_view_ioc_overview`) | `isIOCDocument`: `event.type` includes `indicator` |

---

## Search: deliberate exclusion

`common/search_root_profile` matches `solutionNavId === 'es'` and sets
`SolutionType.Search`. Since none of the logs / traces / security gates above accept
`Search`, no solution features resolve in Search navigation. This profile exists only
to give Search a distinct identity: without it, Search would resolve to the default
context (`SolutionType.Default`) and inherit all Classic behavior.

## Doc-viewer tabs — summary

| Tab | Origin | Shown when |
| --- | --- | --- |
| Log overview | Logs document | log record; in Classic only when the source resolved to the Logs data source profile (see [Logs › Document](#document--observability-log-document-profile)) |
| Overview (trace) | Traces document | trace record: `trace.id` + traces index/data stream |
| GenAI (Tech Preview) | Traces document | trace record with a `gen_ai.*`-style field |
| Alert Overview | Security document | Security data source + `event.kind === 'signal'` (non-attack) |
| Event Overview | Security document | Security data source + `event.kind` present, `!== 'signal'` |
| Attack Overview | Security document | Security data source + attack-discovery alert |
| Indicator (IOC) Overview | Security document | Security data source + `event.type` includes `indicator` |

## Opt-out setting

A single boolean advanced setting, `discover:enableSolutionProfilesInClassic`
(`server/ui_settings.ts`, default `true`, `requiresPageReload`, space-scoped), turns **all**
solution profiles in Classic on or off. It
is not added to the Serverless allowlist, so it only appears in stateful (where Classic
navigation exists).

The classic root profile (`common/classic_nav_root_profile/profile.ts`) reads the setting
once and exposes it as `RootContext.allowSolutionProfiles`. Every `Default` branch then calls
the shared `areSolutionProfilesAllowed(rootContext)` guard (`profiles/root_profile.ts`), which
is always true outside Classic and, in Classic, false only when the setting is disabled. Because
the value is read at root resolution, toggling it takes effect on page reload. The base Classic
behaviors (e.g. the "All logs" ad hoc data view) are **not** gated by this setting.

## Guardrails

- **Search stays generic** — see above.
- **Classic solution features are opt-out** — the `discover:enableSolutionProfilesInClassic`
  setting gates every `Default` branch via `areSolutionProfilesAllowed`.
- **Mixed data is not claimed by Security** — the "every source must be Security"
  rule in `containsOnlySecuritySourcePatterns` (Classic only).
- **Logs flyout tracks the data source in Classic** — the Log overview tab only resolves
  when the logs data source profile already claimed the source (`DataSourceCategory.Logs`),
  so ambiguous `logs-*` / `audit-logs` documents don't get a false-positive flyout.
- **Precedence** — Security data source is registered before Observability, so it is
  offered each source first; non-Security sources fall through to logs/traces.
- **Solution navigations are unchanged** — the `Default` acceptance only affects
  Classic; the `Observability` / `Security` paths behave as before.

## References

- Feature: [`elastic/kibana#252071`](https://github.com/elastic/kibana/issues/252071)
- Proof-of-concept: [`elastic/kibana#289420`](https://github.com/elastic/kibana/pull/289420)
