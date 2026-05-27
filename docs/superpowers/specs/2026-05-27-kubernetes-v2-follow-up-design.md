# Kubernetes onboarding V2 follow-up design

Status: Draft
Date: 2026-05-27
Tracking issue: https://github.com/elastic/ingest-dev/issues/7609
Feature flag: `observability.addDataPageV2Enabled`
Previous spec: `docs/superpowers/specs/2026-05-25-kubernetes-onboarding-v2-design.md`
Handover: `docs/superpowers/2026-05-27-kubernetes-v2-handover.md`

## Goal

Bring the first Kubernetes V2 implementation closer to the POC without changing the route model or V1 behavior.

The current branch already has the correct high-level shape. OpenTelemetry lives at `/kubernetes`. Elastic Agent lives at `/kubernetes/elastic-agent`. The next pass should fill the missing in-page choices:

- OpenTelemetry collector setup mode.
- Optional OpenTelemetry app instrumentation.
- Elastic Agent deployment mode.
- Optional Elastic Agent app instrumentation.

The design uses a mixed approach. Low-risk POC UI and snippets can be implemented now. Fleet-managed Elastic Agent should look like the POC, but it should reuse Fleet-supported policy, token, and Kubernetes manifest behavior instead of inventing a new command path.

## Non-goals

- Do not change V1 `/kubernetes` or `/otel-kubernetes` behavior when the V2 flag is off.
- Do not change the two V2 URLs.
- Do not change visualize or data detection behavior.
- Do not replace existing loading indicators or skeletons.
- Do not globally restyle Fleet enrollment UI.
- Do not create the Kubernetes integration package policy from this onboarding flow in this pass.
- Do not add a Fleet policy picker in this pass.
- Do not move OpenTelemetry SDK guidance into the Elastic Agent path.

## Architecture

Keep the current route and state model:

- `/kubernetes` renders the V2 OpenTelemetry page.
- `/kubernetes/elastic-agent` renders the V2 Elastic Agent page.
- Collection method selection stays path-driven.
- `?ingestion=wired` remains the only query-backed setup state.
- New page choices use local state unless product later asks for deep links.

The V2 pages should own the new POC-style presentation. Shared or extracted V1 step bodies should still be reused when behavior matches. When behavior diverges, add V2-only components rather than adding V2-only conditionals to V1 components.

Fleet-managed Elastic Agent should use a local Kubernetes V2 component for the UI. That component can call Fleet APIs or small onboarding-owned wrappers around Fleet APIs. It should not import Fleet private UI components just to reuse markup. The behavior should be Fleet-backed:

- Get the default Fleet Server URL when available.
- Create or reuse the idiomatic default Fleet agent policy for this flow.
- Reuse the enrollment token for that policy.
- Generate the Kubernetes managed-agent manifest through Fleet's existing `/api/fleet/kubernetes` manifest endpoint.
- Keep the Fleet Server URL and enrollment token editable so users can recover manually.

## OpenTelemetry page

The OpenTelemetry page keeps its current setup data fetching, Managed OTLP callout, wired streams selector, values file URL generation, copy buttons, inline setup errors, loading states, and visualize behavior.

The setup area becomes one top-level step named `Set up the OpenTelemetry Collector`. It has two tabs.

### Elastic Distribution for OTel Collector tab

This tab reuses the current implementation:

- Add the OpenTelemetry Helm repository.
- Show the wired streams ingestion selector.
- Show the generated install command.
- Keep the values file download action.
- Keep current copy button behavior.
- Keep current inline error and loading behavior.

This tab replaces the current separate `Add repository` and `Install the OpenTelemetry Operator` top-level steps with one grouped step.

### Use existing collector tab

This tab adds provisional POC-based guidance for users who already run an OpenTelemetry Collector.

It should show:

- Short text that explains this path is for an existing collector.
- A note that the collector still needs Kubernetes receivers for infrastructure coverage.
- A YAML snippet that adds the `otlp/elastic` exporter based on the POC.
- Copy behavior for the YAML snippet.

The snippet is acceptable for this branch as provisional content. The spec should call out that the snippet still needs product validation before the branch is considered final.

## OpenTelemetry optional instrumentation

The existing OpenTelemetry instrumentation content should become opt-in.

The step starts with the existing intro text and a switch. When the switch is off, the flow shows no language selector or snippets. When the switch is on, the user chooses one card:

- `Annotate specific pods`
- `Annotate entire namespace`

Only the selected annotation path is shown. The language selector remains. The other languages documentation link remains in the OpenTelemetry path. The rollout restart command appears only for the specific-pods path.

The old V1 accordion presentation remains available to V1 only. The V2 page should not show both annotation methods at the same time.

## Elastic Agent page

The Elastic Agent page keeps its current setup data fetching, standalone command generation, wired streams selector, inline setup errors, loading states, copy behavior, and visualize behavior.

The install area becomes one deployment-mode step with two tabs.

### Fleet-managed tab

This tab should look like the POC but use Fleet-supported behavior.

It should:

- Prefill the Fleet Server URL when Fleet exposes a default value.
- Prefill the enrollment token from the default Fleet agent policy used by this flow.
- Create the idiomatic default Fleet agent policy if the default policy is missing, following Fleet's existing `My first agent policy` pattern.
- Keep the Fleet Server URL and enrollment token editable.
- Generate the managed Kubernetes manifest through the existing Fleet manifest endpoint.
- Show the generated YAML preview with copy and download actions.
- Show the `kubectl apply -f elastic-agent-managed-kubernetes.yml` command with copy behavior.
- Show scoped errors inside the Fleet-managed tab when prefill or manifest generation fails.
- Keep editable fields visible after errors so the user can recover manually.

The tab should not create the Kubernetes package policy in this pass. Instead, it should provide a clear CTA or deep link to add or review the Kubernetes integration on the default Fleet policy used by this flow.

This keeps the flow aligned with Fleet's supported enrollment model while avoiding a second implementation of Fleet package-policy setup inside Observability onboarding.

### Standalone tab

This tab preserves the current standalone path:

- Existing generated Helm command.
- Existing wired streams selector.
- Existing skeletons and loading states.
- Existing copy button behavior.
- Existing data detection and visualize behavior.

## Elastic Agent optional app instrumentation

Add an optional app instrumentation step after deployment mode.

The step starts with two cards:

- `Yes`
- `No, infrastructure only`

When `No, infrastructure only` is selected, no app instrumentation details are shown.

When `Yes` is selected, show:

- APM Server URL input.
- Elastic APM language selector.
- Link to the selected Elastic APM agent documentation.

This path should match the POC and use Elastic APM agent docs only. OpenTelemetry SDK documentation belongs in the OpenTelemetry collection method.

## State model

URL-backed state:

- Collection method path.
- `?ingestion=wired`.

Local page state:

- OpenTelemetry collector tab.
- OpenTelemetry instrumentation enabled switch.
- OpenTelemetry annotation mode card.
- OpenTelemetry selected language.
- Elastic Agent deployment tab.
- Elastic Agent app instrumentation choice.
- Elastic Agent selected language.
- Editable Fleet Server URL.
- Editable Fleet enrollment token.
- Editable APM Server URL.

Fleet-backed async state:

- Default Fleet Server URL loading, success, or error.
- Default agent policy loading, success, or error.
- Enrollment token loading, success, or error.
- Kubernetes manifest loading, success, or error.

## Error and loading behavior

Existing setup errors should keep the V2 layout visible. The collection method selector should remain visible. The relevant setup step should show the inline error.

Fleet-managed errors should stay inside the Fleet-managed tab. A failure to prefill the Fleet Server URL, create or fetch the default policy, fetch the enrollment token, or generate the manifest should not break the rest of the Elastic Agent page.

Existing loading skeletons and data detection states should remain as they are. The visualize step should not switch to the POC-only waiting callout.

## Testing strategy

Add focused Jest coverage for the new branches:

- OpenTelemetry collector tabs.
- Existing collector tab text and provisional exporter snippet.
- OpenTelemetry optional instrumentation switch.
- OpenTelemetry pod versus namespace card behavior.
- OpenTelemetry shows only the selected annotation snippet.
- Rollout restart command appears only for pod annotation.
- Elastic Agent deployment tabs.
- Fleet-managed editable Fleet Server URL and enrollment token fields.
- Fleet-managed default policy and token prefill behavior.
- Fleet-managed manifest preview, download, and apply command.
- Fleet-managed scoped error handling.
- Standalone tab keeps the existing generated command path.
- Elastic Agent optional app instrumentation Yes and No branches.
- Elastic APM documentation links in the Elastic Agent path.
- Current route and feature flag tests remain valid.

Update Scout coverage for the main happy paths:

- `/kubernetes` defaults to OpenTelemetry.
- The existing collector tab can be selected.
- Optional OpenTelemetry instrumentation can be enabled and card choices can be selected.
- `/kubernetes/elastic-agent` defaults to the expected Elastic Agent deployment tab.
- Fleet-managed and Standalone tabs can be selected.
- Elastic Agent optional app instrumentation Yes and No branches can be selected.
- `?ingestion=wired` survives collection method switching.
- `/otel-kubernetes?ingestion=wired` still redirects to `/kubernetes?ingestion=wired`.

Do not add Scout assertions for Fleet internals that are already covered by Fleet tests. The onboarding Scout test should verify that the V2 page exposes the expected branch UI and command surface.

## Product validation items

These items should be confirmed before the branch is considered final:

- The provisional `Use existing collector` exporter snippet should be reviewed by the owner of OpenTelemetry Kubernetes guidance.
- Fleet-managed should confirm whether the manifest endpoint is the desired in-product behavior, or whether the newer Helm docs path should replace it later.
- The CTA target for adding or reviewing the Kubernetes integration on the default Fleet policy should be confirmed with Fleet or Ingest UX.

## Verification commands

Run after implementation:

```sh
node scripts/check_changes.ts
node scripts/type_check --project x-pack/solutions/observability/plugins/observability_onboarding/tsconfig.json
node scripts/eslint --fix $(git diff --name-only)
node scripts/jest x-pack/solutions/observability/plugins/observability_onboarding/public/application/pages/kubernetes_v2
node scripts/jest x-pack/solutions/observability/plugins/observability_onboarding/public/application/pages/landing.test.tsx
node scripts/i18n_check --fix
```

Run Scout when local services are available:

```sh
node scripts/scout run-tests --arch stateful --domain classic --testFiles x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/kubernetes_v2_flow.spec.ts
```
