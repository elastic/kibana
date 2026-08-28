# @kbn/flyout-template

Structured layout shell for Kibana flyouts: a declarative compound component that assembles a header, body, and footer into a consistently spaced `EuiFlyout`.

## Usage

```tsx
import { FlyoutTemplate } from '@kbn/flyout-template';

<FlyoutTemplate onClose={onClose} size="m">
  <FlyoutTemplate.Header
    title="Service details"
    titleIcon="info"
    titleTooltip="Additional context about this flyout."
    description="Mar 30, 2022 @ 10:01:21.313"
  />
  <FlyoutTemplate.Body>
    <MyFilterBar />
    <MyDataGrid />
  </FlyoutTemplate.Body>
  <FlyoutTemplate.Footer>
    <FlyoutTemplate.Footer.SecondaryAction label="Discard" onClick={onDiscard} />
    <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={onSave} />
  </FlyoutTemplate.Footer>
</FlyoutTemplate>
```

## Root props

The root forwards a fixed subset of `EuiFlyoutProps` — `id`, `hasChildBackground`, `onClose`, `size`, `minWidth`, `maxWidth`, `type`, `paddingSize`, `ownFocus`, `resizable`, `onResize`, `outsideClickCloses`, `focusTrapProps`, `closeButtonProps`, `session`, `historyKey`, `onActive`, `flyoutMenuProps` — plus `aria-label`, `aria-labelledby`, and `data-test-subj`. Anything not in that list is not accepted. `size` defaults to `m` and `session` defaults to `start`; `flyoutMenuDisplayMode` is fixed to `auto` and is not configurable.

Tab selection props also live on the root: `selectedTabId` (controlled), `defaultSelectedTabId` (uncontrolled initial), and `onTabChange` (called on every tab click either way). See "Tabs" below.

## Zones

**`FlyoutTemplate.Header`** renders three stacked regions: an always-visible title row, a collapsible region holding the description, and an always-visible trailing region with the full-bleed bottom divider.

- `title` — required `ReactNode`. Rendered as an `<h3>` carrying a generated id.
- `titleIcon` — EUI icon type rendered after the title. Without `titleTooltip` it is decorative (`aria-hidden`).
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip` using `titleIcon` as its type, defaulting to `info`.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. Not wrapped in a `<p>`, so block content is valid.
- `collapsed` — renders the compact layout permanently, regardless of scroll position. See "Header collapse".
- `children` — `Header.MetaBlock`, `Header.Badge`, `Header.InfoBlock`, and `Header.Tab` parts. Free-form content (arbitrary elements, components, bare text) is not rendered, and the assembly library warns in development about unrecognized children.

**`FlyoutTemplate.Body`** renders arbitrary children inside `EuiFlyoutBody` in source order, with no sectioning, titling, or dividers added by the template. Each child manages its own layout.

**`FlyoutTemplate.Footer`** renders `PrimaryAction` and `SecondaryAction` right-aligned inside `EuiFlyoutFooter`, secondary first. If neither action is present, the footer is omitted entirely — no default Cancel button is added. Only the first instance of each action is rendered.

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as an `EuiButton`, filled.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.

Both actions take `label`, `onClick`, and optional `id`, `iconType`, `isLoading`, `isDisabled`, `data-test-subj`. The `id` is forwarded to the button element.

## Header blocks

Three declarative parts add secondary content to the header. Declare them as `Header` children in any order — the template groups each kind into its own slot and renders them in a fixed order: meta blocks, then badges, then info blocks, then the tab bar.

```tsx
<FlyoutTemplate.Header title="Alert details" description="Mar 30, 2022 @ 10:01:21.313">
  <FlyoutTemplate.Header.MetaBlock title="Last updated">Dec 3, 2025</FlyoutTemplate.Header.MetaBlock>
  <FlyoutTemplate.Header.Badge color="warning" iconType="warning">Urgent</FlyoutTemplate.Header.Badge>
  <FlyoutTemplate.Header.InfoBlock title="Risk score" size="xl" color="danger">90</FlyoutTemplate.Header.InfoBlock>
</FlyoutTemplate.Header>
```

- **`Header.MetaBlock`** — a compact key/value pair, rendered through `@kbn/flyout-meta-blocks`. Takes `title` (the key, rendered bold) and `children` (the value, which accepts rich content such as links). Use these for provenance: timestamps, owners, authors.
- **`Header.Badge`** — a status label, rendered through `EuiBadge`. Takes `children` (the label) and optional `color`, `iconType`, `iconSide`. Badges label the subject and are not controls, so no `onClick` is exposed. Labels wider than 200px ellipsize.
- **`Header.InfoBlock`** — a titled value in a responsive grid, rendered through `@kbn/flyout-info-blocks`. Takes `title` (a plain string label) and `children` (the value), plus optional `size` and `color` for emphasizing a headline figure. The column count is derived from the number of blocks.

All three also take an optional `id` (an explicit instance identity, auto-generated when omitted) and `data-test-subj`, which passes through to the rendered element.

**Badge overflow.** Up to five badges render inline. Past that, the first four render inline and the rest collapse behind a `+N more` badge that opens them in a popover.

All three groups live in the header's collapsible region, so they animate away when the header collapses on scroll and are never visible when `collapsed` is set. Content that must survive collapse belongs in the title or the tab bar.

## Behavior

- The generated header title id is used for `EuiFlyout`'s `aria-labelledby` only as a fallback: an explicit `aria-labelledby` wins, and an explicit `aria-label` suppresses it. With no labeling props and a header present, the flyout is labeled by the title without a separate `aria-label`.
- A string `title` is forwarded to EUI's flyout menu as the history entry title, and is used as the `aria-label` fallback when the flyout is not labeled by the title id. An explicit `flyoutMenuProps.title` overrides it. A non-string `title` does neither.
- The header's bottom divider bleeds to the flyout edges using the root `paddingSize`; it aligns with the flyout chrome regardless of which padding size is active.
- `FlyoutTemplate.Body` is required. Omitting it logs a dev warning. The header and footer are optional.
- Duplicate zones (e.g. two `FlyoutTemplate.Header` children) log a dev warning and render only the first.
- The zone components (`Header`, `Body`, `Footer`) and the footer action parts render nothing when used outside a `FlyoutTemplate` root.

## Header collapse

Scrolling the body collapses the header to a compact layout: the title drops to an `xs` heading on a single ellipsized line, and the collapsible region animates to zero height and becomes `aria-hidden`. The title row and the divider stay visible in both states.

Collapse is driven by the body's scroll container, so it is template-owned rather than a header prop, and it obeys three rules:

- **Hysteresis.** Collapse needs `scrollTop >= 16`; expansion needs `scrollTop <= 4`. The gap keeps the header from flickering when a scroll settles on the boundary.
- **Overflow guard.** The header only collapses when the body overflows by more than the height the expanded header would hand back — the collapsible region, the taller title row, and the larger spacer combined. Without that gate, collapsing a barely-overflowing body clamps `scrollTop` below the expansion threshold and the header immediately expands again. The guard gates entry only; leaving the collapsed state is decided by scroll position alone, because re-testing it against post-collapse geometry oscillates.
- **Wheel forwarding.** The header itself does not scroll, so a wheel event over it is forwarded to the body scroll container and the default action is prevented, rather than scrolling the page behind the flyout. Firefox's line-mode and page-mode deltas are normalized to pixels.

Transitions are wrapped in `prefers-reduced-motion: no-preference`, so the state change is instant for users who ask for reduced motion.

`collapsed` pins the header to the compact layout: the scroll listener is never attached and the collapsible region is hidden from first render, but wheel forwarding still works.

## Tabs

Declare `Header.Tab` parts inside the `Header` and a matching `Body.TabPanel` for each in the `Body`. The template renders the tab bar at the bottom of the header, wires the `tab`/`tabpanel` accessibility relationship, and mounts only the selected panel.

```tsx
<FlyoutTemplate onClose={onClose} selectedTabId={tabId} onTabChange={setTabId}>
  <FlyoutTemplate.Header title="Alert details">
    <FlyoutTemplate.Header.Tab id="overview" label="Overview" />
    <FlyoutTemplate.Header.Tab id="metadata" label="Metadata" />
  </FlyoutTemplate.Header>

  <FlyoutTemplate.Body>
    <FlyoutTemplate.Body.TabPanel tabId="overview">
      <p>Overview content</p>
    </FlyoutTemplate.Body.TabPanel>
    <FlyoutTemplate.Body.TabPanel tabId="metadata">
      <p>Metadata content</p>
    </FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

Each `Header.Tab` takes `id`, `label`, and optional `disabled`, `prepend`, and `append`. Selection is uncontrolled by default, starting on the first tab; pass `defaultSelectedTabId` to the root to start elsewhere. For controlled selection pass `selectedTabId` and `onTabChange` on the root — `onTabChange` fires on every tab click either way.

The header alone decides which tabs exist. Declaring every panel up front is the simplest approach, but it is not required: a tab whose panel is absent is still rendered and still selectable, so a consumer driving `selectedTabId` may supply only the panel for the current tab and mount the rest on demand.

```tsx
<FlyoutTemplate onClose={onClose} selectedTabId={tabId} onTabChange={setTabId}>
  <FlyoutTemplate.Header title="Alert details">
    <FlyoutTemplate.Header.Tab id="overview" label="Overview" />
    <FlyoutTemplate.Header.Tab id="metadata" label="Metadata" />
  </FlyoutTemplate.Header>

  <FlyoutTemplate.Body>
    {/* Only the selected panel is supplied; the other tab still renders and stays clickable. */}
    <FlyoutTemplate.Body.TabPanel tabId={tabId}>{panelFor(tabId)}</FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

**Behaviors pinned by design:**

- **The tab bar lists every declared `Header.Tab`,** matched or not. A tab whose panel is absent renders normally and stays selectable; selecting it renders an empty body. This is deliberate — a missing panel is indistinguishable from one the consumer has not supplied yet, so it is treated as a pending state rather than an error, and it is never warned about.
- **A `Body.TabPanel` whose `tabId` matches no `Header.Tab` is not rendered** and logs a development warning naming the unmatched ids. Unlike the reverse case this is unambiguous: the header drives the bar, so an unmatched panel can never be reached.
- **Tab bar is suppressed** when no `Body.TabPanel` is declared at all, even if `Header.Tab` parts are present. A flyout with tabs in the header and nothing in the body renders as if there were no tabs. Supply at least the selected panel to keep the bar up.
- **Only the selected panel mounts.** Panel state is discarded on every tab switch. There is no keep-mounted escape hatch. This is a deliberate decision — free to revisit before there are consumers, expensive once there are.
- **Top-level body content is not rendered in tabbed mode.** Once tabbed mode is active, all non-panel children (sections, passthrough content) are ignored. Everything must live inside a panel.

## Test subjects

Zone subjects derive from the root `data-test-subj` prop with a zone suffix, and each zone's own `data-test-subj` overrides it. With no root `data-test-subj`, zones get none unless set explicitly.

| Zone | Default subject | Override prop |
| --- | --- | --- |
| Header | `${root}Header` | `FlyoutTemplate.Header` `data-test-subj` |
| Body | `${root}Body` | `FlyoutTemplate.Body` `data-test-subj` |
| Footer | `${root}Footer` | `FlyoutTemplate.Footer` `data-test-subj` |

Footer action buttons are not derived; their `data-test-subj` passes through to the button as given.
