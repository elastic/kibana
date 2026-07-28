---
name: telemetry-authoring
description: Author product/usage telemetry in Kibana — Usage Collection snapshot collectors (`usageCollection.makeUsageCollector` / `registerCollector`), Event-Based Telemetry (`core.analytics.registerEventType` / `reportEvent`), UI counters (`reportUiCounter`), and `@kbn/ebt-click`. Use when adding or changing any of these, defining a collector `schema`, running `node scripts/telemetry_check`, updating `telemetry/schema/*.json`, or reviewing a PR that touches telemetry. NOT for OpenTelemetry `@kbn/metrics` instrumentation — that is the `kibana-otel-instrumentation` skill.
---

# Kibana — Product Telemetry Authoring

> Telemetry has a step that lives **outside this repo**. Adding a collector or event and running `node scripts/telemetry_check --fix` updates the JSON schema _in Kibana_, but new fields are **not searchable on the telemetry cluster** until the mapping is also updated in the separate `elastic/telemetry` repo (Elastic-internal). Missing that second step is the most common way telemetry silently fails to land. Read §5 before you consider the work done.

## Disambiguation — is this the right skill?

This skill is for **product/usage telemetry** shipped to Elastic's telemetry cluster:

- **Usage Collection** — daily aggregated snapshot stats (`usageCollection`)
- **Event-Based Telemetry (EBT)** — individual behavioral events (`core.analytics`)
- **UI counters / application usage** and **click tracking** (`@kbn/ebt-click`)

It is **not** for OpenTelemetry operational metrics via `@kbn/metrics` (`metrics.getMeter`, `createCounter`, etc.) — use the `kibana-otel-instrumentation` skill for that.

## Pick the mechanism

| You need…                           | Use                                                                  | Schema lives                                            | `telemetry_check`? |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| Aggregate daily cluster stats       | `usageCollection.makeUsageCollector` + `registerCollector`           | inline `schema`, extracted to `telemetry/schema/*.json` | **Yes**            |
| Per-event behavioral data           | `core.analytics.registerEventType` (setup) + `reportEvent` (runtime) | inline on the event type definition                     | No                 |
| Simple UI click/load counts         | `usageCollection.reportUiCounter` (public)                           | rolled into usage collection                            | Indirect           |
| Click events with structured fields | `@kbn/ebt-click` `getEbtProps()` + `data-ebt-*` attrs                | via EBT                                                 | No                 |

**Source of truth (read before authoring):**

- Usage Collection guide: `src/platform/plugins/shared/usage_collection/README.mdx`
- Schema authoring rules/types: `src/platform/packages/private/kbn-telemetry-tools/GUIDELINE.md`
- Telemetry shipping + local EBT debug: `src/platform/plugins/shared/telemetry/README.md`
- End-to-end example incl. the cross-repo step: `x-pack/solutions/observability/plugins/apm/dev_docs/telemetry.md`

## 1. Usage Collection — snapshot collectors

**Rule:** Add `usageCollection` as an **optional** plugin dependency, type the `fetch` return with `makeUsageCollector<Usage>`, give every leaf field a `_meta.description`, and register the collector in plugin **setup**.

```json
// kibana.jsonc / plugin manifest
{ "optionalPlugins": ["usageCollection"] }
```

```ts
const collector = usageCollection.makeUsageCollector<MyUsage>({
  type: 'my_feature',
  isReady: () => isCollectorReady, // gate until dependencies are available
  schema: {
    active_configs: {
      type: 'long',
      _meta: { description: 'Number of active configs at collection time' },
    },
  },
  fetch: async (ctx) => ({ active_configs: await countConfigs(ctx) }),
});
usageCollection.registerCollector(collector);
```

- Allowed leaf `type`s: `long | integer | short | byte | double | float | keyword | text | boolean | date`.
- `_meta.description` on every leaf is **required** — CI rejects new/changed fields without it.
- Arrays: `{ type: 'array', items: { ... } }` (README convention; prefer this for new work).
- Canonical example: `x-pack/platform/plugins/shared/cloud/server/collectors/cloud_usage_collector.ts`. Registration helper pattern: `x-pack/platform/plugins/shared/fleet/server/collectors/register.ts`.

```ts
// Anti-pattern: leaf field with no description → CI fails
schema: {
  active_configs: {
    type: 'long';
  }
} // ❌ missing _meta.description
```

## 2. Schema generation — keep the JSON in sync

**Rule:** After adding or changing a collector `schema`, regenerate the checked-in JSON. The `schema` field and the stored JSON must match or CI fails.

```bash
node scripts/telemetry_check --path=<path/to/collector.ts>   # validate one collector
node scripts/telemetry_check --fix                            # update the stored JSON files
```

- Which collectors map to which JSON files is configured in `.telemetryrc.json` (OSS) and `x-pack/.telemetryrc.json` (x-pack). A collector under an excluded root is silently not extracted — check the config if your schema "won't generate".
- Generated files (do **not** hand-edit field-by-field; regenerate):
  - `src/platform/plugins/shared/telemetry/schema/*.json`
  - `x-pack/platform/plugins/private/telemetry_collection_xpack/schema/xpack_*.json`
- These JSON files intentionally have **no CODEOWNERS entry** so auto-updates don't require review. Do not add one.

## 3. Event-Based Telemetry (EBT)

**Rule:** Register the event type in the plugin's `setup()` (once), then `reportEvent` at runtime. The schema lives on the event type definition — there is no `telemetry_check` step for EBT.

```ts
// events.ts — definition
export const featureUsedEvent: EventTypeOpts<FeatureUsedData> = {
  eventType: 'my_feature_used',
  schema: {
    duration_ms: { type: 'long', _meta: { description: 'Time the action took' } },
  },
};

// plugin.ts — setup: register once
core.analytics.registerEventType(featureUsedEvent);

// runtime: report
analytics.reportEvent('my_feature_used', { duration_ms });
```

- Browser and server both use `core.analytics` (`src/core/packages/analytics/{browser,server}/`).
- Register **all** event types in `setup`; reporting an unregistered `eventType` is dropped.
- Reference patterns: `x-pack/platform/plugins/shared/spaces/public/analytics/register_event_types.ts` (browser), `x-pack/platform/plugins/shared/streams/server/lib/telemetry/ebt/` (server service/client/events split).

### Debug EBT locally

Set `telemetry.localShipper: true` in `kibana.dev.yml` to index events locally:

- `ebt-kibana-browser`, `ebt-kibana-server`.

## 4. UI counters & click tracking

- **UI counters:** `usageCollection?.reportUiCounter(appName, METRIC_TYPE.CLICK, eventName)` (`METRIC_TYPE` from `@kbn/analytics`). These aggregate into the usage-collection report — not EBT.
- **Click events with fields:** `@kbn/ebt-click` — apply `getEbtProps()` to emit `data-ebt-*` attributes; Core listens globally. See `src/platform/packages/shared/kbn-ebt-click/README.md`.

## 5. The cross-repo step — `elastic/telemetry` mapping (the one people miss)

**Rule:** Updating the Kibana JSON schema alone is **not** sufficient to make fields queryable on the telemetry cluster. The field mapping also lives in the separate telemetry repo (Elastic-internal). The required follow-up differs by collection type.

### Usage Collection (snapshot) fields

The snapshot payload lands in the `all-xpack-phone-home` index, which has `dynamic: false`. Fields not present in the index's component templates (e.g., `cluster-stats-mappings.json`) are silently dropped and will not be searchable or aggregatable.

To get a new snapshot field indexed, do one of the following:

1. Open a PR in `elastic/telemetry` to update the right component template or `.edn` config under `kpi-engine/resources/`.
2. Use the self-service **Indexer Workbench** (internal telemetry tooling) to build and test the config change.
3. Open an issue in `elastic/telemetry` or ping **#platform-analytics** on Slack — the team can advise the fastest path.

### EBT fields

EBT events automatically land in `ebt-kibana-browser` (UI) and `ebt-kibana-server` (server) with `properties` indexed as `flattened`. This means all properties are immediately discoverable in the telemetry cluster — **no mandatory telemetry-repo step** for basic analysis.

However, `flattened` limits aggregations and type-specific queries. For production use cases that need proper field types, create a **custom indexer**: a dedicated `.edn` config + job YAML in `elastic/telemetry` that filters to your event type and maps each field explicitly. See the custom index creation guide in the internal telemetry docs, or open an issue in `elastic/telemetry`.

### PR description note

When describing the telemetry follow-up in your public Kibana PR, avoid linking directly to the private `elastic/telemetry` repo — external contributors can't access it. Instead, note it generically:

> "Telemetry-cluster mapping update being coordinated with #platform-analytics."

**Author action:** After opening your Kibana PR, confirm the corresponding mapping change is tracked or opened in `elastic/telemetry`. Don't assume any automatic notification fired.

## 6. CI gate

- Quick check: `.buildkite/scripts/steps/checks/telemetry.sh` (registered in `.buildkite/scripts/steps/checks/quick_checks.json`). On PRs it runs `telemetry_check --baseline <merge-base> --fix` and fails if the schema is stale, a new/changed field lacks `_meta.description`, or a type change is incompatible with the baseline.
- Jest guard: `src/platform/plugins/shared/telemetry/schema/schema_checks.test.ts` (snapshots owned by `@elastic/kibana-telemetry`).
- FTR: `x-pack/platform/test/api_integration/apis/telemetry/telemetry_local.ts` fails with _"The telemetry schemas … are out-of-date. Please … run 'node scripts/telemetry_check --fix'"_ when JSON is stale.

## Author checklist

1. **Mechanism** — picked the right one (§Pick the mechanism); not conflating this with OTel `@kbn/metrics`.
2. **Usage Collection** (if used)
   - [ ] `usageCollection` is an **optional** plugin dependency
   - [ ] `fetch` return typed via `makeUsageCollector<Usage>`
   - [ ] every leaf field has `_meta.description`
   - [ ] `isReady()` gates until data is actually available
   - [ ] collector registered in plugin `setup`
   - [ ] `node scripts/telemetry_check --fix` run; stored JSON committed
   - [ ] collector root is not `exclude`d in `.telemetryrc.json`
3. **EBT** (if used)
   - [ ] event type registered in `setup` (once), reported at runtime
   - [ ] schema fields have `_meta.description`
   - [ ] verified locally with `telemetry.localShipper: true`
4. **Cross-repo (§5)**
   - [ ] determined whether fields must be searchable/aggregatable on the telemetry cluster
   - [ ] if so (snapshot): `elastic/telemetry` component template or `.edn` update is tracked/opened
   - [ ] if so (EBT): decided whether a custom indexer is needed; if yes, tracked/opened
   - [ ] PR description notes the telemetry-cluster follow-up without linking the private repo
5. **CI**
   - [ ] telemetry quick check passes locally (`node scripts/telemetry_check --baseline <merge-base>`)

## Reviewer checklist

- [ ] Correct mechanism for the data (snapshot vs event vs counter); not OTel confusion
- [ ] Every new/changed leaf field has a meaningful `_meta.description`
- [ ] Stored `telemetry/schema/*.json` regenerated and committed (diff matches the collector)
- [ ] `usageCollection` dependency is `optionalPlugins`, not required
- [ ] EBT event types registered in `setup`, not lazily at first report
- [ ] **PR states whether the `elastic/telemetry` mapping needs updating** — challenge if telemetry fields are added with no mention (§5)
- [ ] No hand-edited schema JSON that will be clobbered by `--fix`

## Source references

- Usage Collection guide: `src/platform/plugins/shared/usage_collection/README.mdx`
- Schema authoring + allowed types: `src/platform/packages/private/kbn-telemetry-tools/GUIDELINE.md`
- Tooling (`telemetry_check` / `telemetry_extract`): `src/platform/packages/private/kbn-telemetry-tools/README.md`, `scripts/telemetry_check.js`, `scripts/telemetry_extract.js`
- Schema JSON purpose: `src/platform/plugins/shared/telemetry/schema/README.md`, `x-pack/platform/plugins/private/telemetry_collection_xpack/schema/README.md`
- Shipping + local EBT debug: `src/platform/plugins/shared/telemetry/README.md`
- End-to-end incl. cross-repo mapping: `x-pack/solutions/observability/plugins/apm/dev_docs/telemetry.md`
- Extraction config: `.telemetryrc.json`, `x-pack/.telemetryrc.json`
- CI: `.buildkite/scripts/steps/checks/telemetry.sh`
- Index configs (EDN, current system): `kpi-engine/resources/indices/telemetry/` in `elastic/telemetry`
- Component templates (current system): `kpi-engine/resources/component-templates/telemetry/` in `elastic/telemetry`
- Custom index creation guide: internal telemetry docs
- Indexer Workbench: internal telemetry tooling
