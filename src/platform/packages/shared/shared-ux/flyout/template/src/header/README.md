# Header

The header renders three stacked regions: an always-visible title row, a collapsible region holding the description and the header blocks, and an always-visible trailing region carrying the tab bar and the full-bleed bottom divider. See the package README for the tab bar.

## Blocks

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

## Collapse on scroll

### Scroll behavior

When the user scrolls the flyout body, the header automatically collapses to a compact row showing only the title: it drops to an `xs` heading on a single ellipsized line, with the full text available as a hover tooltip when it is a plain string. The description, meta blocks, badges, and info blocks slide away to give the body the recovered space. The title row, the tab bar, and the divider stay pinned in both states.

Scrolling back to the top restores the full header. The collapse reverses with the same animation, and `prefers-reduced-motion` turns it into an instant swap.

The wheel scrolls the body from anywhere in the header, so the header is not a dead zone for scrolling and the page behind the flyout never scrolls along with it. Modified wheel events (Ctrl/Cmd, Alt, Shift) pass through to the browser so zoom and horizontal scroll keep working.

The behavior is always active and needs no configuration. It self-disables when the flyout body does not overflow enough to cover the complete collapse budget plus the 4px expansion threshold. That budget includes the collapsible content, expanded title row, and expanded spacer, so short flyouts are unaffected. A header with no secondary content at all still collapses, because the title row and spacer shrink on their own.

### Starting collapsed

Set `collapsed` on the header to render the compact row immediately, independent of scroll position:

```tsx
<FlyoutTemplate.Header title="Alert details" collapsed />
```

The description, meta blocks, badges, and info blocks are never visible in this mode, so there is no reason to declare them. Scroll tracking is skipped entirely, and the header stays compact no matter how far the body scrolls. Wheel forwarding still works.

## Implementation notes

These notes cover `use_header_collapse.ts` and `header.tsx` for contributors.

### Clip, not remove

The collapsible region uses the CSS grid trick: a wrapper set to `grid-template-rows: 0fr / 1fr` clips its inner div (which has `min-block-size: 0`) without removing it from the DOM. The content is always present — only its visual box collapses to zero height, and the region becomes `aria-hidden`. A consequence: `element.scrollHeight` (the natural, unclipped height) reads the same value in both states, while `getBoundingClientRect().height` tracks the animated visual height.

### Wheel forwarding

Wheel events over the non-scrollable header would otherwise scroll the page behind the flyout. The hook's `headerRef` callback installs a single non-passive `wheel` listener on the nearest `.euiFlyoutHeader` ancestor (covering its padding). The listener calls `event.preventDefault()` and delegates to the scroll container. That is the entire path — no scroll logic lives in the header component itself. There is no duplication: both the normal scroll path and the forwarded wheel path converge on the same scroll container and trigger the same RAF-throttled `evaluate()` callback.

`WheelEvent.deltaY` is a bare number whose unit comes from `deltaMode`, and `scrollBy` only accepts pixels, so Firefox's line-mode and page-mode deltas are normalized before being forwarded.

### No oscillation

Collapse needs `scrollTop >= 16px` and expansion needs `scrollTop <= 4px`. The gap is a hysteresis band that keeps the header from flickering when a scroll settles on the boundary.

The overflow guard is checked only on the transition _into_ the collapsed state. Its collapse budget is a conservative upper bound on all the space that can return to the body: the collapsible region's natural height plus the full expanded title-row and post-region spacer heights. Including the title and spacer matters for wrapped titles and headers without tabs, because those elements also become shorter in compact mode — and it is what lets a header with an empty collapsible region collapse at all. The body must overflow by more than that budget plus the 4px expansion threshold. A zero budget means nothing has been measured yet, so the header stays expanded.

Once collapsed, the expand decision is driven solely by scroll position. This asymmetry is deliberate: collapsing the header grows the body's client height, which shrinks `scrollHeight − clientHeight` — so re-testing the guard after collapsing would conclude the collapse was invalid, immediately expand, restore the original geometry, and re-collapse in a tight loop.

### ResizeObserver roles

The hook uses observers for the scroll-container viewport and the measurements that make up the collapse budget.

**Scroll-container observer** — watches the EuiFlyoutBody overflow div. It re-runs `evaluate()` when that element's own box changes, so viewport and flyout layout changes are covered without a separate window resize listener. Changes to descendant content alone do not necessarily resize this box; normal scroll events still evaluate the resulting scroll geometry.

**Collapse-budget observers** — watch the collapsible region's inner div, expanded title row, and expanded spacer. Each reads `node.scrollHeight` rather than `contentRect.height`. This is essential for the collapsible region because its observed box reports animated intermediate heights and eventually zero, while `scrollHeight` retains the natural, unclipped height. The title and spacer observers are attached only while expanded, so their last expanded measurements remain stable during collapse.
