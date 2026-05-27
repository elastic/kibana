# Kubernetes onboarding V2: unified collection method flow

Status: Draft
Date: 2026-05-25
Author: Robert Stelmach
Tracking issue: https://github.com/elastic/ingest-dev/issues/7609
Prototype reference: https://github.com/elastic/kibana/pull/256644
Feature flag: `observability.addDataPageV2Enabled`
Parent branch context: `7610-ingest-hubv1-fixes-split-host-onboarding-per-platform-linux-windows-macos`

## Goal

Unify the V2 Kubernetes onboarding entry into one page family with a collection method selector. OpenTelemetry is the default and recommended method. Elastic Agent is available as the second method.

This work is V2 only. The current onboarding page and existing V1 quickstart experience must stay visually and behaviorally unchanged when `observability.addDataPageV2Enabled` is disabled.

The implementation should follow the Host V2 pattern from the parent branch:

- URL-driven collection method selection.
- Search-param preservation across method changes.
- Shared `OnboardingFlowLayout` page chrome.
- Shared `CollectionMethodSelector`.
- Extracted step components reused by both V1 wrappers and V2 pages.

## Non-goals

- Changing the V1 Add Data page layout or cards when the feature flag is off.
- Changing the current V1 `/kubernetes` standalone Elastic Agent page.
- Changing the current V1 `/otel-kubernetes` OpenTelemetry page when the feature flag is off.
- Rewriting Kubernetes install commands, copy buttons, action links, data detection, or dashboard routing.
- Persisting collection method or ingestion mode outside the URL.
- Introducing unrelated Add Data V2 tile migrations.

## Routing

The route behavior depends on `observability.addDataPageV2Enabled`.

When the flag is off:

| URL | Behavior |
|---|---|
| `/kubernetes` | Existing V1 standalone Elastic Agent Kubernetes page |
| `/otel-kubernetes` | Existing V1 OpenTelemetry Kubernetes page |
| `/kubernetes/elastic-agent` | No dedicated V1 route. It falls through to the current catch-all route behavior |

When the flag is on:

| URL | Behavior |
|---|---|
| `/kubernetes` | New V2 unified Kubernetes page with OpenTelemetry selected |
| `/kubernetes/elastic-agent` | New V2 unified Kubernetes page with Elastic Agent selected |
| `/otel-kubernetes` | Redirect to `/kubernetes`, preserving search params |

The V2 Kubernetes tile in `INTEGRATION_TILES` should navigate to `/kubernetes`.

The route swap should be explicit in `observability_onboarding_flow.tsx`. Do not register competing `/kubernetes` routes and rely on route ordering by accident. When the flag is on, the V2 route owns `/kubernetes`. When the flag is off, the existing V1 route owns it.

## URL State

Collection method selection is encoded in the path:

- `/kubernetes` means OpenTelemetry.
- `/kubernetes/elastic-agent` means Elastic Agent.

Ingestion mode is encoded in the query string:

- No `ingestion` param means classic ingestion.
- `?ingestion=wired` means wired streams.

Changing collection method preserves existing search params. For example:

```text
/kubernetes?ingestion=wired -> /kubernetes/elastic-agent?ingestion=wired
```

Changing ingestion mode updates only the `ingestion` query param with `replace`, matching Host V2.

Navigating between methods remounts the selected V2 page and starts a fresh onboarding flow. This matches the Host V2 behavior and avoids leaking onboarding IDs across collection methods.

## Component Structure

Create a V2 page folder for Kubernetes:

```text
public/application/pages/kubernetes_v2/
  index.ts
  kubernetes_otel_page.tsx
  kubernetes_elastic_agent_page.tsx
  kubernetes_collection_method_options.ts
```

The two V2 pages are thin wrappers. They own route-specific state and compose shared pieces.

Shared V2 chrome:

- `OnboardingFlowLayout` renders the page header, return link, step section, banner slot, and feedback slot.
- `CollectionMethodSelector` renders the method choice as step 1.
- The layout uses `logo="kubernetes"`.
- The return link goes back to the V2 landing page and preserves search params.

Extract OpenTelemetry step bodies from `quickstart_flows/otel_kubernetes/otel_kubernetes_panel.tsx`:

- `OtelKubernetesAddRepositoryStep`
- `OtelKubernetesInstallStep`
- `OtelKubernetesInstrumentStep`
- `OtelKubernetesVisualizeStep`

Extract Elastic Agent step bodies from `quickstart_flows/kubernetes/index.tsx`:

- `KubernetesElasticAgentInstallStep`
- `KubernetesElasticAgentVisualizeStep`

The existing V1 panels remain the public wrappers for the existing routes. They continue to own their `EuiPanel`, `EuiSteps`, hooks, data fetching, loading states, error states, and feedback placement. Internally, they compose the extracted step components.

The V2 pages own the new wrapper concerns:

- `OnboardingFlowLayout`.
- The collection method selector step.
- Method route links.
- URL-based ingestion mode.
- Inline setup errors.
- POC-style page chrome.
- Feedback placement at the bottom of the V2 layout.

## OpenTelemetry V2 Page

`/kubernetes` renders the OpenTelemetry variant.

It uses the same flow state as `OtelKubernetesPanel`:

- `useKubernetesFlow('kubernetes_otel')`.
- `usePreExistingDataCheck` with `flow: 'kubernetes'`, `onboardingId`, and the current wired streams behavior.
- `useWindowBlurDataMonitoringTrigger` with `onboardingFlowType: 'kubernetes_otel'`.
- `DataIngestStatus` with `onboardingFlowType="kubernetes_otel"`, `dataset="kubernetes"`, and `integration="kubernetes_otel"`.
- `buildOtelKubernetesActionLinks`.
- `ManagedOtlpCallout`.
- `useManagedOtlpServiceAvailability`.
- `useWiredStreamsStatus`.

The V2 step list is:

1. Choose your collection method.
2. Add the OpenTelemetry repository to Helm.
3. Install the OpenTelemetry Operator.
4. Instrument your application (optional), only when metrics onboarding is enabled.
5. Visualize your data.

The extracted step bodies preserve the current command snippets, copy buttons, values file download action, links, instrumentation language selector, accordions, loading skeletons, and data detection behavior.

OpenTelemetry is marked recommended in the collection method selector.

## Elastic Agent V2 Page

`/kubernetes/elastic-agent` renders the Elastic Agent variant.

It uses the same flow state as `KubernetesPanel`:

- `useKubernetesFlow()`.
- `usePreExistingDataCheck` with `flow: 'kubernetes'` and `onboardingId`.
- `useWindowBlurDataMonitoringTrigger` with `onboardingFlowType: 'kubernetes'`.
- `DataIngestStatus` with `onboardingFlowType="kubernetes"`, `dataset="kubernetes"`, and `integration="kubernetes"`.
- Current dashboard and logs action links.
- Current `CommandSnippet` behavior.

The V2 step list is:

1. Choose your collection method.
2. Install standalone Elastic Agent on your Kubernetes cluster.
3. Monitor your Kubernetes cluster.

The extracted step bodies preserve the current command snippet, copy button behavior, wired streams selector, loading skeletons, action links, and data detection behavior.

## Error And Loading Behavior

V1 behavior remains unchanged:

- `KubernetesPanel` and `OtelKubernetesPanel` keep returning full-panel `EmptyPrompt` errors as they do today.
- Their loading skeletons remain in the same step positions.
- Their `CustomHeader`, `PageTemplate`, `EuiPanel`, `EuiSteps`, and feedback placement remain unchanged.

V2 behavior follows Host V2:

- Setup errors render inline inside the relevant install step.
- The header, return link, collection method selector, and layout stay visible on error.
- Loading indicators come from the extracted step components, not from newly invented placeholders.

If `EmptyPrompt` inline behavior from the Host V2 branch is already available, reuse it. Do not add a second error component for Kubernetes.

## Shared Component Expectations

Use existing shared components where they fit:

- `OnboardingFlowLayout` for page chrome.
- `OnboardingFlowHeader` through the layout.
- `CollectionMethodSelector` for method selection.
- `FeedbackButtons` in the layout feedback slot.

The implementation may add small flow-specific helpers when they prevent duplication between the two V2 pages or between V1 and V2. Good candidates are:

- A helper to build Kubernetes collection method options while preserving search params.
- A URL search-param helper for `ingestion` if the Host V2 implementation already introduced one.
- A step status helper only if there is more than one real consumer in this PR.

Do not add broad abstractions unless the Kubernetes work creates the second concrete consumer.

## Testing Strategy

Add focused Jest coverage.

Page and route tests:

- Feature flag off keeps `/kubernetes` on the existing V1 page.
- Feature flag off keeps `/otel-kubernetes` on the existing V1 OTel page.
- Feature flag on renders V2 OpenTelemetry at `/kubernetes`.
- Feature flag on renders V2 Elastic Agent at `/kubernetes/elastic-agent`.
- Feature flag on redirects `/otel-kubernetes` to `/kubernetes`, preserving search params.
- V2 Kubernetes tile navigates to `/kubernetes`.

V2 page tests:

- `/kubernetes` renders `OnboardingFlowLayout`, Kubernetes header copy, and `CollectionMethodSelector`.
- OpenTelemetry is selected and recommended on `/kubernetes`.
- Elastic Agent is selected on `/kubernetes/elastic-agent`.
- Selector navigation preserves `?ingestion=wired`.
- OTel page composes the extracted OTel steps.
- Elastic Agent page composes the extracted Elastic Agent steps.
- Inline setup errors keep the selector visible.

Regression tests:

- Existing tests for `KubernetesPanel` and `OtelKubernetesPanel` stay green.
- Step extraction should not change existing test IDs used by current tests.
- Add tests for any extracted step component only when the behavior is easier to assert at that level than through the V1 wrapper.

Scout coverage should mirror the Host V2 approach:

- Flag on, click the V2 Kubernetes tile and land on `/kubernetes`.
- Confirm OpenTelemetry is selected by default.
- Switch to Elastic Agent and assert `/kubernetes/elastic-agent`.
- Switch back to OpenTelemetry and assert `/kubernetes`.
- Set wired streams mode and confirm `?ingestion=wired` survives method switching.
- Navigate to `/otel-kubernetes` with the flag on and confirm redirect to `/kubernetes`.

## Verification Commands

Run scoped checks after implementation:

```sh
node scripts/check_changes.ts
node scripts/type_check --project x-pack/solutions/observability/plugins/observability_onboarding/tsconfig.json
node scripts/eslint --fix $(git diff --name-only)
node scripts/jest x-pack/solutions/observability/plugins/observability_onboarding
node scripts/i18n_check --fix
```

For Scout:

```sh
node scripts/scout run-tests --arch stateful --domain classic --testFiles x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/<kubernetes-v2-spec>.spec.ts
```

## Risks

The highest risk is accidental V1 behavior drift during step extraction. The mitigation is to keep V1 panels as wrappers and preserve their current layout, loading states, errors, test IDs, and step ordering.

Route swapping is the second risk. The mitigation is explicit feature-flag route tests for `/kubernetes`, `/kubernetes/elastic-agent`, and `/otel-kubernetes`.

Data detection is also sensitive. The mitigation is to keep hook ownership in the page wrappers and pass current values into pure step components. Do not move detection hooks into extracted step bodies.

## Open Questions

None. The design decisions above were agreed during brainstorming on 2026-05-25.
