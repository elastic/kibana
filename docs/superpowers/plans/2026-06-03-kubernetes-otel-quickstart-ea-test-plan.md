# Kubernetes OTel Quickstart And EA Test Preservation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the current Kubernetes quickstart present OpenTelemetry as the only user-facing quickstart option, while keeping Elastic Agent Kubernetes test coverage available through direct route entry.

**Architecture:** The Add Data Kubernetes category should stop showing the Elastic Agent quickstart card. The Elastic Agent Kubernetes route and page should stay available because Ensemble still uses the Kibana Playwright test to generate and execute the Elastic Agent installation snippet. Scout and legacy Playwright tests should enter the Elastic Agent flow directly instead of clicking a removed quickstart card.

**Tech Stack:** React, TypeScript, EUI, Kibana Observability onboarding, Scout Playwright, legacy Playwright e2e, Ensemble nightly workflows.

---

## Main Message

The product decision is to remove choice from the current Kubernetes quickstart. Users should see one Kubernetes quickstart recommendation, OpenTelemetry.

This is not the same as deleting the Elastic Agent Kubernetes flow. Ensemble still runs Kubernetes Elastic Agent e2e jobs, and those jobs depend on the Kibana Playwright test to copy the generated command into an artifact. The implementation should remove the user-facing quickstart entry point, then update tests to reach Elastic Agent through direct navigation.

## Source Context

Slack thread:
- `https://elastic.slack.com/archives/C0AGF3HUXPD/p1780484049875369`

GitHub issue referenced in the thread:
- `elastic/ingest-dev#7324`

Ensemble run called out as relevant:
- `https://github.com/elastic/ensemble/actions/runs/26863966091`

Important thread decision:
- Kubernetes quickstart should be opinionated.
- OpenTelemetry should be the recommended path.
- Elastic Agent should be removed from the current quickstart choice.
- This should apply to both Serverless and ECH.
- Elastic Agent coverage is still needed because there are existing EA e2e jobs.

## Product Scope

### In Scope

- Remove the Elastic Agent Kubernetes card from the user-facing Kubernetes quickstart cards in Add Data.
- Keep the OpenTelemetry Kubernetes card visible for the Kubernetes category.
- Preserve the Elastic Agent Kubernetes route and flow for automated tests and direct access.
- Update Scout tests that currently expect the Elastic Agent quickstart card.
- Update Ensemble-backed Playwright tests that currently click the Elastic Agent quickstart card.
- Keep the same generated `code_snippet_kubernetes.sh` artifact behavior for Ensemble.

### Out Of Scope

- Redesign the new Kubernetes V2 flow.
- Remove the Elastic Agent route.
- Remove Elastic Agent Kubernetes source files.
- Disable Ensemble Kubernetes EA jobs.
- Change generated Helm command semantics.
- Change data validation behavior in Ensemble.
- Solve the self-managed OpenTelemetry gateway concern raised in the Slack thread.

## Key Assumptions

- "Remove the Elastic Agent option from quickstart" means remove it from the featured Kubernetes quickstart cards shown after selecting the Kubernetes use case.
- The Elastic Agent Kubernetes flow can remain available by direct URL.
- V1 behavior still matters for Ensemble because the legacy Playwright test uses the V1 route and V1 page object.
- V2 behavior can continue to cover `/kubernetes/elastic-agent` directly because that is a separate V2 route.
- The first PR should avoid changing Ensemble workflow definitions unless direct route entry in Kibana is not enough.

## Current Behavior

The Kubernetes category currently shows two featured quickstart cards:

- `kubernetes-quick-start`, which is the Elastic Agent Kubernetes path.
- `otel-kubernetes`, which is the OpenTelemetry Kubernetes path.

The card list is controlled here:

```tsx
const featuredCardsForCategoryMap: Record<Category, string[]> = {
  host: ['auto-detect-logs', 'otel-logs'],
  kubernetes: ['kubernetes-quick-start', 'otel-kubernetes'],
  application: ['apm-virtual', 'otel-virtual', 'synthetics-virtual'],
  cloud: ['azure-logs-virtual', 'aws-logs-virtual', 'gcp-logs-virtual'],
};
```

The Elastic Agent card itself is defined in `use_custom_cards.tsx` with id `kubernetes-quick-start`. It links to `/kubernetes`.

The OpenTelemetry card is defined with id `otel-kubernetes`. It links to `/otel-kubernetes`.

## Desired Behavior

When a user selects the Kubernetes category in Add Data:

- The OpenTelemetry Kubernetes card is visible.
- The Elastic Agent Kubernetes quickstart card is not shown as a featured quickstart option.
- Clicking the visible Kubernetes OpenTelemetry card navigates into the OpenTelemetry flow.

For automated tests:

- Scout tests that validate the Add Data landing page should expect the OpenTelemetry card only.
- Scout tests that validate Elastic Agent Kubernetes internals should navigate directly to the Elastic Agent route.
- Legacy Playwright `kubernetes_ea.spec.ts` should navigate directly to the Elastic Agent route and still write `code_snippet_kubernetes.sh`.
- Ensemble jobs should continue to pass without needing the removed card.

## Important Route Distinction

There are two route models to keep straight.

V1:
- `/kubernetes` renders the current Elastic Agent Kubernetes flow.
- `/otel-kubernetes` renders the current OpenTelemetry Kubernetes flow.

V2 when `observability.addDataPageV2Enabled` is true:
- `/kubernetes` renders the V2 OpenTelemetry Kubernetes page.
- `/kubernetes/elastic-agent` renders the V2 Elastic Agent Kubernetes page.
- `/otel-kubernetes` redirects to `/kubernetes`.

The quickstart removal should not collapse these routes. Tests should use the route that matches the flow they are actually validating.

## File Map

Modify:
- `x-pack/solutions/observability/plugins/observability_onboarding/public/application/onboarding_flow_form/onboarding_flow_form.tsx`
- `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/fixtures/page_objects/onboarding_app.ts`
- `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/onboarding_ui_validation.spec.ts`
- `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/wired_streams_elastic_agent_kubernetes.spec.ts`
- `x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/kubernetes_ea.spec.ts`
- `x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/pom/pages/onboarding_home.page.ts`

Likely do not modify:
- `x-pack/solutions/observability/plugins/observability_onboarding/public/application/quickstart_flows/kubernetes/index.tsx`
- `x-pack/solutions/observability/plugins/observability_onboarding/public/application/quickstart_flows/kubernetes/build_helm_command.ts`
- `x-pack/solutions/observability/plugins/observability_onboarding/public/application/observability_onboarding_flow.tsx`
- `x-pack/solutions/observability/plugins/observability_onboarding/public/application/pages/kubernetes_v2/kubernetes_elastic_agent_page.tsx`
- `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/kubernetes_v2_flow.spec.ts`

Only modify V2 files if reviewers decide the V2 Elastic Agent card selector should also be hidden. That is a separate product decision from the current quickstart card removal.

## Task 1: Remove Elastic Agent From Featured Kubernetes Quickstart

**Files:**
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/public/application/onboarding_flow_form/onboarding_flow_form.tsx`

- [ ] Change the Kubernetes featured card list from two cards to one card.

Expected implementation:

```tsx
const featuredCardsForCategoryMap: Record<Category, string[]> = {
  host: ['auto-detect-logs', 'otel-logs'],
  kubernetes: ['otel-kubernetes'],
  application: ['apm-virtual', 'otel-virtual', 'synthetics-virtual'],
  cloud: ['azure-logs-virtual', 'aws-logs-virtual', 'gcp-logs-virtual'],
};
```

- [ ] Do not delete the `kubernetes-quick-start` card definition in `use_custom_cards.tsx` in this task.

Reason:

The card definition also owns the direct URL and metadata for the existing flow. Removing it completely has a larger behavior surface because custom cards are also passed to search. The quick win discussed in Slack is to stop showing two quickstart choices in the Kubernetes category.

- [ ] After this change, select the Kubernetes use case and confirm the featured list shows only the OpenTelemetry Kubernetes card.

Manual expectation:

```text
Visible: integration-card:otel-kubernetes
Hidden from featured Kubernetes quickstart list: integration-card:kubernetes-quick-start
```

## Task 2: Update Scout Onboarding Page Object Waits

**Files:**
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/fixtures/page_objects/onboarding_app.ts`

- [ ] Update `openWithCategory('kubernetes')` to wait for `otelKubernetesCard` instead of `kubernetesQuickStartCard`.

Expected implementation:

```ts
case 'kubernetes':
  await this.otelKubernetesCard.waitFor({ state: 'visible' });
  break;
```

- [ ] Update `selectKubernetesUseCase()` to wait for `otelKubernetesCard` instead of `kubernetesQuickStartCard`.

Expected implementation:

```ts
async selectKubernetesUseCase() {
  const kubernetesRadio = this.kubernetesUseCaseTile.getByRole('radio');
  await kubernetesRadio.click();
  await this.otelKubernetesCard.waitFor({ state: 'visible' });
}
```

- [ ] Keep the `kubernetesQuickStartCard` getter for now.

Reason:

Some tests may still assert that the card is hidden or may use the getter during transition. Removing it is cleanup and can happen only after all references are gone.

## Task 3: Update Scout Landing Page Validation

**Files:**
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/onboarding_ui_validation.spec.ts`

- [ ] In `shows correct quickstart flows for each use case`, replace the Kubernetes expectations.

Current expectation:

```ts
await pageObjects.onboarding.selectKubernetesUseCase();
await expect(pageObjects.onboarding.kubernetesQuickStartCard).toBeVisible();
await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
```

Expected implementation:

```ts
await pageObjects.onboarding.selectKubernetesUseCase();
await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
await expect(pageObjects.onboarding.kubernetesQuickStartCard).toHaveCount(0);
```

- [ ] Rename the test currently titled `navigates correctly within Kubernetes Host flow`.

Suggested title:

```text
navigates correctly within Kubernetes OpenTelemetry flow
```

- [ ] Update the click navigation step to click the OpenTelemetry card.

Expected implementation:

```ts
await test.step('navigates correctly when Kubernetes OpenTelemetry card is clicked', async () => {
  await pageObjects.onboarding.selectKubernetesUseCase();
  await pageObjects.onboarding.clickIntegrationCard('integration-card:otel-kubernetes');
  expect(page.url()).toContain('/otel-kubernetes');
});
```

If V2 is enabled in this suite, the final URL may become `/kubernetes` because `/otel-kubernetes` redirects in V2. In that case, assert the OTel page signal instead of hard-coding the route.

- [ ] Update the keyboard-only test to expect only the OpenTelemetry card.

Expected implementation:

```ts
await expect(pageObjects.onboarding.otelKubernetesCard).toBeVisible();
await expect(pageObjects.onboarding.kubernetesQuickStartCard).toHaveCount(0);
```

- [ ] Update keyboard navigation to target the OpenTelemetry card.

Expected implementation:

```ts
await page.keyTo('[data-test-subj="integration-card:otel-kubernetes"] button', 'Tab');
await page.keyboard.press('Enter');
expect(page.url()).toContain('/otel-kubernetes');
```

Again, if V2 redirects this suite to `/kubernetes`, assert the final URL that actually matches the configured feature flag.

## Task 4: Update Scout Elastic Agent Wired Streams Spec To Use Direct Route

**Files:**
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/wired_streams_elastic_agent_kubernetes.spec.ts`

- [ ] Stop navigating through the removed quickstart card.

Current pattern:

```ts
await pageObjects.onboarding.selectKubernetesUseCase();
await pageObjects.onboarding.clickIntegrationCard('integration-card:kubernetes-quick-start');
await pageObjects.onboarding.waitForIngestionModeSelector();
```

Expected implementation:

```ts
await page.gotoApp('observabilityOnboarding/kubernetes');
await pageObjects.onboarding.waitForIngestionModeSelector();
```

- [ ] Update the test step label.

Suggested label:

```text
navigate directly to Elastic Agent Kubernetes flow
```

- [ ] Apply the same direct route setup in both tests in the file.

The second test currently repeats the same quickstart-card navigation before validating the command.

- [ ] Keep the existing assertions unchanged unless the direct route changes timing.

Assertions to preserve:

```ts
await expect(pageObjects.onboarding.ingestionModeSelector).toBeVisible();
await expect(pageObjects.onboarding.classicIngestionOption).toBeVisible();
await expect(pageObjects.onboarding.wiredStreamsOption).toBeVisible();
await expect(pageObjects.onboarding.techPreviewBadge).toBeVisible();
```

Command assertions to preserve:

```ts
const classicCommand = await pageObjects.onboarding.getKubernetesCommandContent();
expect(classicCommand).not.toContain('_write_to_logs_streams');

await pageObjects.onboarding.selectWiredStreams();
const wiredCommand = await pageObjects.onboarding.getKubernetesCommandContent();
expect(wiredCommand).toContain('_write_to_logs_streams=true');
```

## Task 5: Update Ensemble-Backed Playwright EA Test

**Files:**
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/kubernetes_ea.spec.ts`
- Modify: `x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/pom/pages/onboarding_home.page.ts`

- [ ] Add a direct navigation helper for the V1 Elastic Agent Kubernetes flow.

Suggested helper in `onboarding_home.page.ts`:

```ts
public async gotoKubernetesElasticAgentFlow() {
  await this.page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding/kubernetes`);
}
```

- [ ] Use the helper in `kubernetes_ea.spec.ts`.

Current setup:

```ts
await onboardingHomePage.selectKubernetesUseCase();
await onboardingHomePage.selectKubernetesQuickstart();
```

Expected implementation:

```ts
await onboardingHomePage.gotoKubernetesElasticAgentFlow();
```

- [ ] Keep everything after navigation unchanged.

Important preserved behavior:

```ts
if (useWiredStreams) {
  await wiredStreamsSelector.selectWiredStreamsMode();
}

await kubernetesEAFlowPage.assertVisibilityCodeBlock();
await kubernetesEAFlowPage.copyToClipboard();
const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;
await page.evaluate('window.dispatchEvent(new Event("blur"))');
fs.writeFileSync(outputPath, clipboardData);
```

- [ ] Keep the file name as `code_snippet_kubernetes.sh`.

Reason:

Ensemble waits for the snippet artifact produced by this Playwright test. Changing the file name would require a coordinated Ensemble repo change.

- [ ] Consider removing `selectKubernetesQuickstart()` only if no references remain.

Before removing it, search:

```bash
rg "selectKubernetesQuickstart\\(|kubernetesQuickStartCard|integration-card:kubernetes-quick-start" x-pack/solutions/observability/plugins/observability_onboarding
```

If there are no remaining callers, remove:

```ts
private readonly kubernetesQuickStartCard: Locator;

this.kubernetesQuickStartCard = this.page.getByTestId(
  'integration-card:kubernetes-quick-start'
);

public async selectKubernetesQuickstart() {
  await this.kubernetesQuickStartCard.click();
}
```

## Task 6: Decide Whether To Add A Unit Test

**Files:**
- Optional modify: an existing test near `onboarding_flow_form.tsx`, if one exists and already covers featured cards.

- [ ] Search for existing tests around `featuredCardsForCategoryMap` or Kubernetes category cards.

Command:

```bash
rg "featuredCardsForCategoryMap|integration-card:kubernetes-quick-start|integration-card:otel-kubernetes|shows correct quickstart" x-pack/solutions/observability/plugins/observability_onboarding/public x-pack/solutions/observability/plugins/observability_onboarding/test/scout
```

- [ ] If there is a focused React unit test for category card rendering, update it to assert the Elastic Agent card is absent and the OpenTelemetry card is present.

Expected assertion shape:

```ts
expect(screen.queryByTestId('integration-card:kubernetes-quick-start')).not.toBeInTheDocument();
expect(screen.getByTestId('integration-card:otel-kubernetes')).toBeInTheDocument();
```

- [ ] If there is no nearby unit test, rely on the Scout landing page test for this quick win.

Reason:

The behavior is already covered at the UI level by `onboarding_ui_validation.spec.ts`. Adding a new unit scaffold just for one featured card list is probably not worth the extra surface unless reviewers ask for it.

## Task 7: Verify The Change

**Files:**
- No code files changed in this task.

- [ ] Run targeted Scout tests.

Command:

```bash
node scripts/scout.js run-tests --arch stateful --domain classic --testFiles x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/onboarding_ui_validation.spec.ts,x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/wired_streams_elastic_agent_kubernetes.spec.ts,x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/wired_streams_otel_kubernetes.spec.ts
```

Expected:

```text
All selected Scout tests pass.
```

- [ ] Run the legacy Playwright EA test if the local environment supports the Ensemble-style setup.

This may not be practical locally because the test expects external environment variables and a Kubernetes cluster.

Command shape:

```bash
node scripts/playwright test --config x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/playwright.config.ts x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/kubernetes_ea.spec.ts
```

Expected:

```text
The test reaches the Elastic Agent Kubernetes page directly and writes code_snippet_kubernetes.sh.
```

- [ ] If the legacy Playwright command cannot run locally, run TypeScript and lint checks for the touched files.

Lint command:

```bash
node scripts/eslint x-pack/solutions/observability/plugins/observability_onboarding/public/application/onboarding_flow_form/onboarding_flow_form.tsx x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/fixtures/page_objects/onboarding_app.ts x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/onboarding_ui_validation.spec.ts x-pack/solutions/observability/plugins/observability_onboarding/test/scout/ui/tests/wired_streams_elastic_agent_kubernetes.spec.ts x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/kubernetes_ea.spec.ts x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/stateful/pom/pages/onboarding_home.page.ts
```

Expected:

```text
No lint errors.
```

Type check command:

```bash
node scripts/type_check --project x-pack/solutions/observability/plugins/observability_onboarding/tsconfig.json
```

Expected:

```text
Type check completes without errors for observability_onboarding.
```

## Acceptance Criteria

- [ ] Selecting Kubernetes in Add Data shows the OpenTelemetry Kubernetes quickstart card.
- [ ] Selecting Kubernetes in Add Data no longer shows the Elastic Agent Kubernetes quickstart card as a featured option.
- [ ] The OpenTelemetry Kubernetes card still opens the OTel Kubernetes flow.
- [ ] The Elastic Agent V1 Kubernetes route still renders directly at `/app/observabilityOnboarding/kubernetes` when V2 is disabled.
- [ ] The V2 Elastic Agent Kubernetes route still renders directly at `/app/observabilityOnboarding/kubernetes/elastic-agent` when V2 is enabled.
- [ ] `wired_streams_elastic_agent_kubernetes.spec.ts` no longer clicks `integration-card:kubernetes-quick-start`.
- [ ] `onboarding_ui_validation.spec.ts` no longer expects `integration-card:kubernetes-quick-start` to be visible.
- [ ] `kubernetes_ea.spec.ts` no longer clicks `selectKubernetesQuickstart()`.
- [ ] `kubernetes_ea.spec.ts` still writes `code_snippet_kubernetes.sh`.
- [ ] Ensemble Kubernetes EA jobs can continue using the same artifact contract.

## Risks And Mitigations

Risk: Removing only the featured card may leave Elastic Agent reachable through Add Data search.

Mitigation: Confirm product intent during review. If the intent is to remove all Add Data discovery, remove or gate the `kubernetes-quick-start` custom card in `use_custom_cards.tsx` and update tests accordingly. Do not do that silently in the quick win PR.

Risk: Direct route entry might render V2 OTel instead of V1 Elastic Agent if the V2 feature flag is enabled in the wrong environment.

Mitigation: Keep Scout V1 EA tests in the same setup they currently use. For V2 EA coverage, use `/kubernetes/elastic-agent`. For the Ensemble-backed legacy Playwright test, validate the environment keeps V2 disabled or navigate to the correct direct EA route for that environment.

Risk: The keyboard navigation test may become brittle if it assumes the first Kubernetes card.

Mitigation: Target `integration-card:otel-kubernetes` directly and assert the OTel destination.

Risk: Removing the page object getter too early can break transition tests.

Mitigation: Keep `kubernetesQuickStartCard` until all references are removed or changed to absence assertions.

## Review Notes For The PR

In the PR description, call out:

- This PR removes Elastic Agent from the Kubernetes quickstart choices.
- This PR does not delete the Elastic Agent Kubernetes flow.
- The EA e2e tests now use direct route entry because Ensemble still validates EA onboarding.
- The OpenTelemetry flow remains the user-facing Kubernetes quickstart path.

Suggested PR summary:

```markdown
## Summary

- Updates the Kubernetes Add Data category to show OpenTelemetry as the only featured quickstart option.
- Keeps Elastic Agent Kubernetes available by direct route for existing automated coverage.
- Updates Scout and Ensemble-backed Playwright tests so EA coverage no longer depends on the removed quickstart card.

## Test plan

- Run targeted Scout tests for onboarding UI validation and Kubernetes wired streams.
- Run lint and type checks for touched Observability onboarding files.
- Validate that the legacy Kubernetes EA Playwright test still reaches the EA flow directly and writes `code_snippet_kubernetes.sh`.
```

## Short Talking Point

We are removing Elastic Agent from the Kubernetes quickstart choice so the current flow has one recommended path, OpenTelemetry. We are not deleting the Elastic Agent flow. Tests that still need Elastic Agent coverage should enter it directly by URL, which keeps Ensemble working while removing the extra user-facing choice.
