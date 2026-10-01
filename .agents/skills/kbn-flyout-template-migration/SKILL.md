---
name: kbn-flyout-template-migration
description: Migrate a Kibana flyout to the shared `@kbn/flyout-template` component. Use when converting an `EuiFlyout`-based flyout (header/body/footer, badges, tabs, an actions menu) to `FlyoutTemplate`, deciding how to feed dynamic content into its declarative zones, or producing before/after screenshot galleries for a flyout UI change.
---

# Migrating a flyout to `@kbn/flyout-template`

`@kbn/flyout-template` (source: `src/platform/packages/shared/shared-ux/flyout/template`) is the shared, declarative flyout. This skill captures the non-obvious constraints, the two ways to supply dynamic content to its zones, how to verify the result with a before/after screenshot gallery, and how to run the migration as an agent.

Read the package `README.md` and the per-zone READMEs (`src/header`, `src/body`, `src/footer`) first — they are the API reference. This skill is the *migration playbook* on top of them.

## The template model (read this before planning)

`FlyoutTemplate` is a declarative **assembly**, not a slot/render-prop component:

- You nest `FlyoutTemplate.Header`, `.Body`, `.Footer` as children, and *parts* inside them. Tabs are the root `tabs` prop paired with `Body.TabPanel tabId=...`. The parts per zone:
  - Header: `Header.Badge` / `.MetaBlock` / `.InfoBlock`
  - Body: `Body.Callout` / `.Section` / `.Accordion` / `.TabPanel`
  - Footer: `Footer.PrimaryAction` / `.SecondaryAction` / `.PrimaryActionMenu`
- **Zones and parts must be *direct* children of their parent.** The parser (`@kbn/ui-react-assembly`) flattens arrays and React fragments, but a wrapper *component* is treated as opaque passthrough and **renders nothing**.
  - `<Header><MyBadges/></Header>` where `MyBadges` returns `Header.Badge` elements shows no badges.
  - `{myBadgesArray}` (a mapped array/fragment of `Header.Badge` elements) works.
- **Header and Footer reject free-form content** — only the curated parts render. **Body allows arbitrary passthrough children** (search bars, data grids, charts) alongside its parts.
- **Zones are all-or-nothing.** `FlyoutTemplate.Header` reads template context (`useFlyoutTabs`, `useFlyoutHeaderCollapse`, …) that only `FlyoutTemplate` provides, so you cannot mount a single template zone inside a plain `EuiFlyout`. There is no partial adoption within an `EuiFlyout` — the swap is atomic per flyout.
- Prop handling:
  - **Forced:** `paddingSize="m"`, `flyoutMenuDisplayMode="auto"`.
  - **Defaulted:** `size="m"`, `session="start"`.
  - **Not forwarded:** `ref`.
  - **Passthrough** (every other `EuiFlyoutProps`): `session`, `historyKey`, `size`, `minWidth`, `maxWidth`, `ownFocus`, `resizable`, `onClose`, `flyoutMenuProps`, `className`/`css`, `data-*`.
- **Sticky header vs collapse-on-scroll** — don't conflate them in plans or PR copy:
  - *Sticky* (header pinned while the body scrolls) is baseline `EuiFlyout` behavior, not a template feature.
  - *Collapse-on-scroll* is the template's addition: the header shrinks (dropping description/badges/meta/info, compacting the title) as the body scrolls, reclaiming space.
- Two integration styles:
  - **Inline** `<FlyoutTemplate>` — when the host already mounts/unmounts the flyout and owns `onClose`. Matches most existing host-controlled flyouts.
  - **Imperative** `core.overlays.openFlyoutTemplate(options, ContentComponent)` — gives history/session management and `useFlyoutClose`.

## Mapping an existing flyout onto the template

| Existing | Template |
| --- | --- |
| `EuiFlyoutHeader` title (plain or link) | `Header` `title` (a `ReactNode` — pass the link/tooltip node; the template owns the `<h3>` and its id/`aria-labelledby`) |
| Status/label badges | `Header.Badge` (static) / `.MetaBlock` / `.InfoBlock` |
| `EuiTabs` in the header | root `tabs` + controlled `selectedTabId`/`onTabChange`, with `Body.TabPanel tabId=...` per tab |
| `EuiFlyoutBody` content | `Body` free-form children and/or `Body.Section` / `.Accordion` / `.Callout` |
| Footer buttons | `Footer.PrimaryAction` / `.SecondaryAction` |
| Footer actions popover (`EuiContextMenu`) | `Footer.PrimaryActionMenu` with `panels: FlyoutFooterMenuPanel[]` |

Guidance:

- **Preserve `data-test-subj`s.** Keep the same subjects on the flyout root, title link, actions button, menu items, sections, etc.
  - This lets existing Jest/Scout selectors and page objects keep working — often the whole "update the tests" step collapses to near-nothing.
  - `PrimaryActionMenu` gives the trigger button your exact `data-test-subj` and the panel that value + `"Panel"`.
- **Header badges are labels by default.** `Header.Badge` historically forbade `onClick`/`href`; interactive/clickable badges (navigate on click, with a tooltip) may require extending the template's badge part. If you extend it:
  - Intersect the full `EuiBadgeProps` — do **not** `Omit` it. `EuiBadgeProps` is an EUI `ExclusiveUnion`, and a plain `Omit` collapses the union to common keys and silently drops `onClick`/`href`.
  - Use EUI's `DistributiveOmit` (`import type { DistributiveOmit } from '@elastic/eui'`) for any derived descriptor type.
  - A tooltip needs explicit support (wrap the badge in `EuiToolTip` in the renderer) — a bare `EuiBadge` has no tooltip slot.
- **Preserve coupled behaviors.** Chart-tooltip z-index `<Global>` overrides, a shared `historyKey` grouping nested child flyouts, telemetry effects on tab change — these live outside the container swap; carry them over unchanged.
- Add `@kbn/flyout-template` to the consuming package's `tsconfig.json` `kbn_references`.

## Supplying dynamic content to zones

Because zones/parts must be direct children and header/footer reject free-form content, you need a strategy to turn runtime data into parts. Two proven approaches:

### 1. Hooks (single-consumer flyout you fully own)

Author the entire `<FlyoutTemplate>` tree in **one component rendered inside the flyout's context providers**, and have hooks return the parts as direct children:

```tsx
function ServiceFlyoutContent({ title, onClose, historyKey, selectedTabId, onTabChange }) {
  const titleNode = useFlyoutTitle(title);          // returns a ReactNode
  const badges = useFlyoutBadges();                  // returns Header.Badge[] (array is flattened)
  const { panels, isLoading, hasActions } = useFlyoutFooterMenu(); // returns FlyoutFooterMenuPanel[]
  return (
    <FlyoutTemplate onClose={onClose} session="start" historyKey={historyKey} tabs={tabs} selectedTabId={selectedTabId} onTabChange={onTabChange} data-test-subj="...">
      <FlyoutTemplate.Header title={titleNode}>{badges}</FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.TabPanel tabId="overview"><Overview /></FlyoutTemplate.Body.TabPanel>
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.PrimaryActionMenu label="Actions" panels={panels} isLoading={isLoading} isDisabled={isLoading || !hasActions} data-test-subj="..." />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
}
```

Key points:
- The whole tree lives in this one component because the parts must be *direct* children of the zones and the zones direct children of `<FlyoutTemplate>` — you cannot split zones into sub-components.
- The hooks must run where the flyout's context is available, so the content component is rendered *inside* the context providers, and the providers wrap the content component (not the other way round).
- A hook that uses other hooks (e.g. `useLocatorUrl` to build an href) must be called **unconditionally** — call it every render and only include the resulting part conditionally.
- If a shared sub-component (e.g. a badge used elsewhere) needs to feed a part, extract a **descriptor** from it:
  - A pure function or hook returning `{ color, label, href, onClick, tooltip, … }`.
  - Have both the standalone component and the flyout render from it — one source of truth for i18n/status logic, no divergence.

### 2. Structured descriptor API (multi-consumer flyout with injected content)

When content is injected by multiple teams through an extension point (the Doc Viewer's `renderHeader`/`renderFooter` is the canonical case), free-form React trees can't be dropped into curated zones. Replace the opaque render functions with a **structured descriptor API** (`getHeaderTitle`, `getHeaderBadges`, `getHeaderMetaBlocks`, `getHeaderInfoBlocks`, footer action descriptors).

The decoupling trick that makes this shippable incrementally: **type the API against the shared descriptor packages, not against the template.**

- `@kbn/flyout-info-blocks` → `InfoBlockItem` (`{ id?, title: string, value: ReactNode, … }`)
- `@kbn/flyout-meta-blocks` → `MetaBlock` (`{ id?, title: ReactNode, value: ReactNode, … }`)
- `@kbn/flyout-sections`, `@kbn/ui-callout` for body parts

These packages are standalone (no template context) and are exactly the shapes the template's `Header.InfoBlock`/`.MetaBlock` parts consume, which is what makes the sequencing cheap:

- The same descriptor arrays render **today** via an interim block inside the current `EuiFlyout`, and **after the swap** via the template parts — identical pixels on both sides.
- The API change and each consumer's adoption ship as independent PRs with no template dependency.
- The final template swap reduces to re-parenting content that already renders.

For footer menus that can't be expressed as a curated item list (nested `EuiContextMenu` panels, action components with setter props, overlays that must mount as children), give the footer-action parts a **node slot** (`panel: ReactNode`) rather than a data descriptor: the template keeps the footer chrome, trigger button, `isLoading`/`isDisabled`, and placement; the consumer owns the menu contents.

**Choosing:** hooks for a self-contained flyout whose content you own end-to-end; the structured API when an extension point injects arbitrary content from other plugins, when you must sequence a multi-team migration, or when curated parts can't express the content.

## Before/after screenshot gallery (verification)

A temporary Scout spec that drives the flyout into each visual state and writes full-page PNGs, run once before the migration and once after, is the most convincing PR artifact for a flyout UI change.

- **Output + parametrization.** Write to the gitignored `.playwright-mcp/flyout-migration/<run>/` where `<run>` is `process.env.FLYOUT_SHOT_RUN ?? 'before'`. Confirm the directory is gitignored (`git check-ignore -v .playwright-mcp/`).
- **Full-page captures.** Use `page.screenshot({ path, animations: 'disabled' })` (viewport, includes the surrounding app for context) rather than cropping to the flyout — popovers/menus render in portals outside the flyout's box.
- **Mark everything `TEMP — delete before merge`** and keep the spec out of the real suites' intent (it's a capture harness, not assertions).
- **Reuse existing page objects and `data-test-subj`s.** If the migration preserves subjects, the same gallery spec runs unchanged for both `before` and `after`.
- **States worth capturing:** overview/open, a second service/entity (different icon), the footer actions menu *open*, a nested/child flyout, and the collapse-on-scroll header. Each is a `test.step`.

Gotchas learned the hard way:

- **Side-by-side vs stacked child flyout.** When a child flyout opens in the same session, EUI renders it beside the parent at wide viewports and *stacks* it (with a menu back button) at narrow ones. To get the side-by-side shot:
  - Keep the viewport wide (e.g. 1600px).
  - **Guard it** — assert two `euiFlyoutCloseButton`s exist (one per flyout) so a responsive flip to stacked fails loudly instead of capturing the wrong layout.
- **Capturing collapse-on-scroll.** The header only collapses when the body actually overflows and a real scroll fires; at a tall viewport the content fits and nothing scrolls. For that step:
  - Shrink the viewport height (e.g. 600px) so the body overflows.
  - Find the real scroll container and scroll it — poll until it overflows, then set `scrollTop` (which dispatches the `scroll` event the collapse hook listens for). A programmatic set on a non-overflowing element is a no-op, and a mouse wheel can be swallowed by charts.
  - Keep the collapse wait best-effort so the same step also works pre-migration (where it never collapses).
- **Producing a comparable baseline "before" after you've already migrated.** The dev server used by `scout start-server` **hot-reloads**, so you can swap the flyout back to baseline without a restart:
  - Back up the existing `before/` dir first.
  - `git checkout <baseline-sha> -- <the few flyout source files>` to revert just the flyout — not the behavior-preserving shared descriptor/badge refactors, which keeps the revert small and self-consistent.
  - Wait for the optimizer to rebuild, re-run the gallery as `before`, and verify one shot actually rendered baseline before trusting it.
  - `git checkout HEAD -- <files>` to restore.
- **Running it.**
  - `node scripts/scout run-tests --arch stateful --domain classic --testFiles <spec>` provisions its own server + data.
  - If a server is already running, run directly against it: `node scripts/playwright test --config <…/parallel.playwright.config.ts> --project local --grep "<describe>"` (prefix `FLYOUT_SHOT_RUN=after` for the after run).
  - Screenshot paths resolve against the process CWD — run from the repo root so they land in the repo's `.playwright-mcp/`.

## Testing the migrated flyout

- **Hook-based parts:** test the hooks with `renderHook` and assert the returned elements' props (`badge.props.onClick`, `item['data-test-subj']`, …). Rendering a bare `Header.Badge` outside the assembly renders nothing, so don't try to assert its DOM in isolation.
- **Container test:** mock `@kbn/flyout-template` with a lightweight stand-in that renders the zone children and exposes `onClose`/`historyKey`/`onTabChange`/`tabs`, and mock the content hooks. This keeps the container test focused on state/telemetry/`historyKey` wiring.
- **Keep existing `it(...)` titles**; adapt the assertions to the new shapes rather than renaming.
- EUI/jsdom reminders:
  - `renderWithKibanaRenderContext` for `euiTheme`.
  - EUI screen-reader text renders twice (`getAllByText`).
  - EUI popovers never fully settle in jsdom (`pointerEventsCheck: 0`, panels don't unmount on close).

## Running the migration as an agent

- **Explore first.** Map the existing flyout (container, header, body, footer, badges, tabs, how it's mounted/closed, coupled globals) and the template's public API (parts, root props, overlay API) before planning. The direct-children constraint and the header/footer free-form rejection are the two facts that most shape the plan.
- **Checkpoint per layer.** Pause for review between layers — later layers build on earlier decisions (e.g. the descriptor shape). A good order:
  1. Any template part extension.
  2. Shared descriptor/badge refactors.
  3. The container/header/footer swap.
  4. Tests.
- **Verify with `node scripts/check --scope branch`** — one branch-scoped run; don't pipe it (that masks the exit code).
  - It pulls *consuming* packages into scope (anything importing the template), so a failing test there may be pre-existing and unrelated.
  - Example: a **timezone-dependent** test that expects UTC (`Jan 1`) but gets local time (`Dec 31, 05:00 PM`) because CI runs `TZ=UTC` and your shell doesn't.
  - Confirm provenance with `git log --oneline main..HEAD -- <file>` before assuming your change caused it.
- **Git hygiene:** leave finished work as uncommitted changes for the human to commit unless told otherwise; in a shared worktree never use bare `git stash`/`pop` (use a tagged `git stash push -u -m` and `git stash apply <sha>`).
