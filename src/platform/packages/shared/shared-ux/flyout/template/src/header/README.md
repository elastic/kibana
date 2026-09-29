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

- **`Header.MetaBlock`** — a compact key/value pair, rendered through `@kbn/flyout-meta-blocks`. Accepts a `title` (the key, rendered bold), `children` (the value, which accepts rich content such as links), and the rest of the `MetaBlock` props. Use these for provenance (e.g., timestamps, owners, authors).
- **`Header.Badge`** — a status label, rendered through `EuiBadge`. Accepts `children` (the label) and the rest of the `EuiBadgeProps`, excluding control props (`onClick`, `onClickAriaLabel`, `iconOnClick`, `iconOnClickAriaLabel`, `href`, `target`, `rel`) because badges serve as subject labels rather than controls. Labels wider than 200px are ellipsized.
- **`Header.InfoBlock`** — a titled value in a responsive grid, rendered through `@kbn/flyout-info-blocks`. Accepts a `title` (a plain string label), `children` (the value), and the rest of the `InfoBlockItem` props (including `size` and `color` to emphasize a headline figure). The column count is derived from the number of blocks.

All three also take an optional `id` (an explicit instance identity, auto-generated when omitted) that keys the part internally and is not rendered as a DOM id. `data-test-subj` and any `data-*` attributes are passed through to the rendered element.

**Badge overflow.** Up to five badges render inline. Past that, the first four render inline and the rest collapse behind a `+N more` badge that opens them in a popover.

All three groups live in the header's collapsible region, so they animate away when the header collapses on scroll and are never visible when `collapsed` is set. Content that must survive collapse belongs in the title or the tab bar.

## Collapse on scroll

### Scroll behavior

When the user scrolls the flyout body, the header automatically collapses to a compact row showing only the title and its icon: the title drops to an `xs` heading on a single ellipsized line, with the full text available as a hover tooltip when it is a plain string. The description, meta blocks, badges, and info blocks slide away to give the body the recovered space. The title row, the tab bar, and the divider stay pinned in both states.

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

The collapsible region uses a CSS grid trick (`grid-template-rows: 0fr / 1fr`) to clip its content without removing it from the DOM. The content is always there, but its visual height animates to zero and it becomes `aria-hidden`. Because of this, `element.scrollHeight` (the natural, unclipped height) stays the same even when collapsed, while `getBoundingClientRect().height` tracks the animated visual height.

### Wheel forwarding

The header is not scrollable, so `wheel` events over it would normally scroll the page behind the flyout. To prevent this, the hook's `headerRef` callback adds a single non-passive `wheel` listener to the `EuiFlyoutHeader` element. Listening on this outer element ensures the header's padding is covered.

Because `EuiFlyoutHeader` does not forward a ref, the callback finds it via `closest()` using the Kibana-owned `FLYOUT_HEADER_CLASS_NAME` class applied in `header.tsx`. We deliberately avoid EUI's internal `euiFlyoutHeader` class. The listener calls `event.preventDefault()` and forwards the scroll to the body scroll container. The header component itself contains no scroll logic. Instead, both normal scrolling and forwarded wheel events hit the same scroll container and use the same RAF-throttled `evaluate()` callback.

`WheelEvent.deltaY` is a bare number whose unit comes from `deltaMode`, and `scrollBy` only accepts pixels, so Firefox's line-mode and page-mode deltas are normalized before being forwarded.

### No oscillation

Collapse triggers at `scrollTop >= 16px` and expansion triggers at `scrollTop <= 4px`. The gap is a hysteresis band that prevents the header from flickering when a scroll settles on the boundary.

The overflow guard is only checked when transitioning _into_ the collapsed state. The collapse budget is a conservative estimate of the space that will be returned to the body when the header collapses: the collapsible region's natural height plus the height of the expanded title row and spacer. The body must overflow by more than this budget plus the 4px expansion threshold.

Once collapsed, the decision to expand is based purely on the scroll position. This is because collapsing the header increases the body's height and shrinks its scrollable area. If we re-checked the guard after collapsing, it would see the smaller scroll area, think it can't collapse, and immediately expand again, causing an endless loop.

### ResizeObserver roles

The hook uses observers for the scroll-container viewport and the measurements that make up the collapse budget.

**Scroll-container observer** — watches the EuiFlyoutBody overflow div. It re-runs `evaluate()` when that element's own box changes, so viewport and flyout layout changes are covered without a separate window resize listener. Changes to descendant content alone do not necessarily resize this box; normal scroll events still evaluate the resulting scroll geometry.

**Collapse-budget observers** — watch the collapsible region's inner div, expanded title row, and expanded spacer. Each reads `node.scrollHeight` rather than `contentRect.height`. This is essential for the collapsible region because its observed box reports animated intermediate heights and eventually zero, while `scrollHeight` retains the natural, unclipped height. The title and spacer observers are attached only while expanded, so their last expanded measurements remain stable during collapse.
