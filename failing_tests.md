# Silently Failing Jest Tests

These tests were hidden by a broken Jest log-buffering mechanism (reverted in PR #270569).
All failures are from Buildkite build [#446773](https://buildkite.com/elastic/kibana-pull-request/builds/446773).

## Summary

All failures are either **test adjustment** (test code is wrong/outdated) or **potential bug**
(application code needs attention). Most APM tests appear to be recently written tests with
broken mock setups. The security test is clearly outdated.

---

## Security Solution

### ✅ Test adjustment

- **File**: `x-pack/solutions/security/plugins/security_solution/server/cases/attachments/register.test.ts`
- **Test**: `registerCaseAttachments › registers exactly the two expected unified attachment types`
- **Error**: `expect(framework.registerUnified).toHaveBeenCalledTimes(2)` — actual calls: **3**
- **Cause**: `register.ts` now calls `registerUnified` for endpoint, event, **and indicator** (3 types),
  but the test was never updated after the indicator attachment was added in #270293.
- **Fix**: Update `toHaveBeenCalledTimes(2)` → `(3)` and update the test/describe description. **Done.**

---

## APM — Trace Waterfall (shard 3/5)

### ✅ Test adjustment

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/trace_waterfall/use_trace_watefall.test.ts`
- **Tests**:
  - `getLegends › assigns a unique color to each resource`
  - `getLegends › handles duplicate resource names gracefully`
  - `getLegends › rotates the palette if there are more than 10 unique resources`
- **Error**: Expected `color: "color0"`, received `color: "#16C5C0"` (real EUI color)
- **Cause**: `jest.mock('@elastic/eui', () => ({ euiPaletteColorBlind: jest.fn(...) }))` replaces
  the entire EUI module, breaking other EUI imports consumed during test setup. The mock does not
  intercept the actual `euiPaletteColorBlind` call as a result.
- **Fix**: Use `...jest.requireActual('@elastic/eui')` spread to keep all real EUI exports and only
  override `euiPaletteColorBlind`. **Done.**

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/trace_waterfall/trace_item_row.test.tsx`
- **Tests**: All `TraceItemRow` tests (renders Bar, renders toggle, on toggle, etc.)
- **Error**: `Unable to find an element by: [data-test-subj="bar"]`
- **Cause**: The mock uses `actual.EuiAccordion` (the real component) to render `buttonContent`.
  The real `EuiAccordion` calls `useEuiTheme()` internally, which is mocked with a **partial** theme
  object in the test's `beforeEach`. The missing theme tokens cause `EuiAccordion` to fail to
  render the `buttonContent` prop (where `Bar` lives).
- **Fix**: Replace `actual.EuiAccordion` in the mock with a minimal component that renders
  `buttonContent` and `children` directly. **Done.**

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/trace_waterfall/bar_details.test.tsx`
- **Tests**:
  - `BarDetails › renders the span name and formatted duration`
  - Several `in case of errors` tests (badge rendering)
  - `in case of service name badge` tests
- **Error**: `Unable to find an element with the text: 1234 ms` (also missing badge elements)
- **Cause**: `jest.mock('../../../../common/utils/formatters', ...)` mock likely not intercepting
  `asDuration` at runtime; `EuiBadge` with `iconType` renders text in a nested span that may
  split text across elements. Additionally `useTraceWaterfallContext` `beforeAll` mock resets
  break isolation between nested describe blocks. **Needs investigation / running locally.**
- **Status**: 🔍 Needs investigation

---

## APM — Trace Waterfall (shard 4/5)

### 🔍 Needs investigation

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/trace_waterfall/index.test.tsx`
- **Tests**: `TraceWaterfall` — accordion toggle, virtualization, scroll strategy
- **Error**: `Unable to find an element with the text: Test Transaction`
- **Cause**: Component test, likely mock provider setup missing (EUI or APM context)

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/settings/agent_explorer/agent_instances/agent_instances_details/index.test.tsx`
- **Tests**: All `AgentInstancesDetails` tests
- **Error**: `Unable to find an element by: [data-test-subj="metric-overview-link"]`,
  `[data-test-subj="popover-tooltip"]`, etc.
- **Cause**: Child component mocks (e.g. `MetricOverviewLink`, `PopoverTooltip`) are declared but
  the real components render instead. Possibly a module resolution difference between test file and
  component file relative paths, or a mock hoisting issue with the storybook jest setup.
- **Status**: 🔍 Needs investigation — likely **test bug** (mock paths)

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/settings/agent_explorer/agent_instances/index.test.tsx`
- **Tests**: All `AgentInstances` tests
- **Error**: Various missing elements in rendered output
- **Status**: 🔍 Needs investigation — likely **test bug**

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/service_map/service_node.test.tsx`
- **Tests**: `ServiceMapGraph` service node tests
- **Status**: 🔍 Needs investigation

---

## APM — Links / Settings (shard 2/5)

### 🔍 Needs investigation

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/shared/links/discover_links/open_in_discover.test.tsx`
- **Tests**: `OpenInDiscover` — all consumer scenario tests
- **Error**: Rendering and assertion failures
- **Status**: 🔍 Needs investigation — likely **test bug** (mock setup)

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/service_map/use_service_map_badges.test.ts`
- **Tests**: All `useServiceMapBadges()` tests
- **Error**: Hook return value doesn't match expectations
- **Status**: 🔍 Needs investigation — could be **test bug** or **potential bug** in hook

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/settings/agent_configurations/agent_configuration_create_edit/settings_page/settings_page.test.tsx`
- **Tests**: All `SettingsPage - Advanced Configuration` tests
- **Error**: Elements not found in rendered output
- **Status**: 🔍 Needs investigation — likely **test bug** (missing context wrappers)

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/transaction_details/waterfall_with_summary/waterfall_container/unified_waterfall_flyout.test.tsx`
- **Tests**: All `UnifiedWaterfallFlyout` tests
- **Error**: Elements not found in rendered output
- **Status**: 🔍 Needs investigation — likely **test bug**

---

## APM — Transaction Details / Service Map (shard 5/5)

### 🔍 Needs investigation

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/transaction_details/waterfall_with_summary/waterfall_container/unified_waterfall_container.test.tsx`
- **Tests**: All `UnifiedWaterfallContainer` tests
- **Error**: Various elements not found (e.g. "Test Transaction" text)
- **Notes**: Uses `renderWithTheme` — has EUI provider — may be a **test bug** or **potential bug**

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/service_map/use_service_map_alerts_tab_href.test.ts`
- **Tests**: All `useServiceMapAlertsTabHref` / `useServiceMapAlertsNavigateFactory` tests
- **Error**: Hook return values don't match expectations
- **Status**: 🔍 Needs investigation

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/service_map/graph_controls.test.tsx`
- **Tests**: All `ServiceMapGraph - Controls` tests
- **Error**: Elements not found in rendered output
- **Status**: 🔍 Needs investigation — likely **test bug**

---

- **File**: `x-pack/solutions/observability/plugins/apm/public/components/app/transaction_details/index.test.tsx`
- **Tests**: All `TransactionDetails` tests
- **Error**: Rendering failures
- **Status**: 🔍 Needs investigation

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Test adjustment | Test code was wrong/outdated; fixed in this PR |
| 🔍 Needs investigation | Exact cause unclear without running locally; likely test bug |
| 🐛 Potential bug | Application code likely needs attention |
