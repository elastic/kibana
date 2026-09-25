---
navigation_title: EUI test helpers
description: Use and contribute EUI Component Objects from @elastic/eui-test-helpers in Scout tests
---

# EUI test helpers [scout-eui-test-helpers]

[`@elastic/eui-test-helpers`](https://github.com/elastic/eui/tree/main/packages/test-helpers) provides helpers for interacting with [EUI](https://eui.elastic.co) components reliably in consumer tests, so you stop guessing at CSS selectors that only seem right. For [Scout](./scout.md)/[Playwright](https://playwright.dev) consumers it ships **Component Objects**: semantic wrappers around a single Playwright `Locator` that encapsulate user-like interactions for a specific EUI component.

The package lives in the `elastic/eui` monorepo (`packages/test-helpers`) but was inspired by, and is consumed through, Scout.

::::::{tip}
Use the built-in methods your test framework provides for basic, native-like components. Reach for a Component Object only when a component is non-trivial to drive reliably (portals, virtualization, async state).
::::::

## Usage in Scout [scout-eui-test-helpers-usage]

Component Objects are exposed pre-bound to the page through the `page.components` factory. You don't construct them yourself:

```ts
import { test } from '../fixtures';

test('selects a data view', async ({ page }) => {
  const comboBox = page.components.comboBox('dataViewSelector');
  await comboBox.setSelectedOptions(['logs-*']);
  expect(await comboBox.getSelectedOptions()).toEqual(['logs-*']);
});
```

Each factory takes the component's root `data-test-subj` and an optional `scope` (a `Locator` or another Component Object) to target an instance inside a specific subtree:

```ts
const comboBox = page.components.comboBox('dataViewSelector', someFlyout);
```

## Scope: What belongs here [scout-eui-test-helpers-scope]

- **In scope**: enabling consumer end-to-end tests to set up and tear down component state reliably, so the test can focus on its actual assertion instead of navigating EUI's DOM.
- **Out of scope**: testing EUI component behavior. EUI already has RTL unit tests, Cypress E2E tests, and Loki VRT tests for that. A method added only to exercise an EUI feature (e.g. "click the clear button to verify `onChange` fires") belongs in EUI's own suite. The package's validation tests prove **the helper itself works**; they don't substitute for EUI's tests.

::::::{note}
Each Component Object targets one EUI component: `page.components.comboBox` drives an `EuiComboBox` only. Pointing it at a different component that happens to share the same `data-test-subj` (e.g. an `EuiSelectable`) fails on purpose, since the helper validates the component type internally. Unlike some FTR helpers, it won't silently operate on the wrong component, something to watch for when migrating.
::::::

## Contribute a helper [scout-eui-test-helpers-contribute]

The full contributor journey is: prototype in Scout, validate against Kibana, port to EUI, then publish. Prototyping in Kibana first means you exercise the helper against the real DOM it must support, not a curated Storybook story.

:::::::::{stepper}

::::::::{step} Prototype the Component Object in `kbn-scout`
Build the object in Kibana, iterating against real specs, before porting it to EUI:

- Add it under `src/platform/packages/shared/kbn-scout/src/playwright/eui_components/`.
- Register it on the `page.components` factory so specs call `page.components.<name>(testSubj)`.
- Write or convert the Scout specs that use it and run them locally.

::::::::

::::::::{step} Validate against Kibana in CI
Local runs cover only a slice. Open a draft Kibana PR and run CI to confirm the specs that use the helper pass across every stateful/serverless lane.

**Read first-attempt failures, not only the final status.** Scout retries a failed spec once, so a lane can be green overall while its first attempt failed. A first-attempt failure in a spec that uses your helper often points to helper flakiness (a race the retry hides). Fix it before publishing.

::::::::

::::::::{step} Port to EUI
Once proven, move the object into `packages/test-helpers` in `elastic/eui` with its `selectors.ts`, validation specs, and a component README, following the package's [CONTRIBUTING guide](https://github.com/elastic/eui/blob/main/packages/test-helpers/CONTRIBUTING.md). Open the EUI PR.

::::::::

::::::::{step} Re-validate via a snapshot and publish
See [Validate against Kibana before publishing](#scout-eui-test-helpers-validate) below.

::::::::

:::::::::

When authoring the object, follow the design principles, directory structure, and spec conventions in the [package CONTRIBUTING guide](https://github.com/elastic/eui/blob/main/packages/test-helpers/CONTRIBUTING.md). It's the source of truth for how helpers are structured and kept stable against the evolving EUI DOM.

## Validate against Kibana before publishing [scout-eui-test-helpers-validate]

To run the *published* helper through Kibana CI you need a **snapshot**, a prerelease published to the npm registry:

- **Nightly**: EUI auto-publishes a snapshot on weekdays under the `snapshot` dist-tag. Pin Kibana's `@elastic/eui-test-helpers` to that exact version.
- **On demand**: label your EUI PR `ci:regression-integration-test-kibana` to build a snapshot from the PR head and kick off the Kibana integration chain.

::::::{warning}
The on-demand label publishes an npm snapshot using EUI's trusted credentials and builds the exact commit at the PR head. Only add it to **your own** PRs, and only after you have reviewed and trust that exact commit. Snapshots are moving prereleases and get pruned, so **never merge a Kibana PR on a snapshot pin**. Repin to the official release before merging.
::::::

## How EUI, the helpers and Kibana are tested together [scout-eui-test-helpers-integration]

`@elastic/eui` and `@elastic/eui-test-helpers` are two packages in one monorepo with **independent versions**. Kibana pins each separately in `package.json`, so a helper release can ship without an EUI release and the other way round. Three checks keep the three moving parts compatible:

1. **On every EUI PR**, the helper validation specs run against Storybook. A PR that touches an EUI component also runs the specs of the matching helper (correlated by directory path), so a DOM change that would break a helper fails the EUI PR, not a Kibana test later. See [Flake detection](https://github.com/elastic/eui/blob/main/packages/test-helpers/CONTRIBUTING.md#ci-integration).
2. **Every weeknight**, EUI publishes snapshots of both packages, opens a draft Kibana PR titled `[DO NOT MERGE][EUI] Nightly Build` that bumps Kibana to them, and runs full Kibana CI. This answers "will today's EUI `main` break Kibana?" before anything is released. Source: [`update_kibana_dependencies.yml`](https://github.com/elastic/eui/blob/main/.github/workflows/update_kibana_dependencies.yml).
3. **On release**, an EUI maintainer opens the Kibana upgrade PR with the official versions. Because the nightly already ran against the same code, that PR is expected to be a clean version bump.

### Breaking changes and prep commits [scout-eui-test-helpers-prep-commits]

If an EUI or helper change needs a matching Kibana change (a removed export, a renamed selector key, a snapshot update), the author of the EUI change prepares it ahead of the release:

1. Open a Kibana PR with the fix pinned to a snapshot that contains the EUI change, so its CI can run. Keep the code change and the version pin in **separate commits**.
2. Add the code commit's URL under `@next` in [`packages/release-cli/kibana-prep-commits`](https://github.com/elastic/eui/blob/main/packages/release-cli/kibana-prep-commits) in `elastic/eui`, ideally in the same EUI PR.
3. The nightly and the release upgrade PR cherry-pick every commit in that list. On release, `@next` moves to `@previous` so the nightly stays green until the upgrade PR merges.

The Kibana PR is a reference and is closed once the upgrade PR lands. Details and commit conventions: [Testing EUI features in Kibana](https://github.com/elastic/eui/blob/main/wiki/contributing-to-eui/testing/testing-in-kibana.md).

### When something fails [scout-eui-test-helpers-failures]

- **Helper spec fails on an EUI PR**: the component change broke the helper. Fix the helper in the same PR, or the component change is not mergeable.
- **Nightly Kibana build is red**: an unreleased EUI or helper change breaks Kibana. Either the change needs a prep commit (above), or the change itself needs fixing before Monday's release. The EUI team is notified in Slack. If the failure is in Scout specs that use a helper, it is usually ours to look at.
- **Kibana CI fails after a version bump on `main`**: the upgrade PR missed a consumer. Fix forward in Kibana; the nightly should have caught it, so also check why it did not.

## Release [scout-eui-test-helpers-release]

Publishing is deliberately gated: merging to EUI `main` does **not** publish anything.

- **Snapshots** are the automated part: nightly on weekdays, plus on demand via the label above.
- **Official releases** are run by an EUI maintainer, roughly weekly. There is no cron. A package publishes only if it is included in the release run, so `@elastic/eui-test-helpers` must be explicitly included. If your change needs to ship, ping the EUI maintainers to include the package in the next release.

## Related [scout-eui-test-helpers-related]

- [Page objects](./page-objects.md): Kibana-app interaction wrappers (Component Objects are the EUI-component-level equivalent).
- [UI testing](./ui-testing.md) and [UI test best practices](./ui-best-practices.md).
- [`@elastic/eui-test-helpers` package](https://github.com/elastic/eui/tree/main/packages/test-helpers) and its [CONTRIBUTING guide](https://github.com/elastic/eui/blob/main/packages/test-helpers/CONTRIBUTING.md).
- [Testing EUI features in Kibana](https://github.com/elastic/eui/blob/main/wiki/contributing-to-eui/testing/testing-in-kibana.md) and [EUI test helpers CI](https://github.com/elastic/eui/blob/main/wiki/contributing-to-eui/testing/eui-test-helpers.md) in the EUI wiki.
