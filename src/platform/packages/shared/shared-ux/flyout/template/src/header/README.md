# Header

The header renders three stacked regions:

1. A title row, always visible.
2. A collapsible region holding the description and the header blocks.
3. A trailing region, always visible, holding the tab bar and the full-bleed bottom divider.

See the package README for the tab bar.

## Props

- `title` — required `ReactNode`. Rendered as an `<h3>` with a generated id. That id labels the flyout (see the package README's [Labeling](../../README.md#labeling-and-the-flyout-menu-title)).
- `titleIcon` — EUI icon type rendered after the title, in both the expanded and the compact layout. Without `titleTooltip`, it is decorative (`aria-hidden`).
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip`. It uses `titleIcon` as its type, or `info` if `titleIcon` is not set.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. It is not wrapped in a `<p>`, so block content is valid.
- `collapsed` — always renders the compact layout, regardless of scroll position. See [Starting collapsed](#starting-collapsed).
- `children` — `Header.MetaBlock`, `Header.Badge`, and `Header.InfoBlock` parts. Anything else, such as elements, components, or bare text, is not rendered. The assembly library warns in development about unrecognized children.

The bottom divider bleeds past the header's padding to the flyout edges, so it lines up with the flyout chrome.

## Blocks

Three declarative parts add secondary content to the header. Declare them as `Header` children in any order. The template groups each kind into its own slot and always renders them in this order: meta blocks, badges, info blocks, then the tab bar.

```tsx
<FlyoutTemplate.Header title="Alert details" description="Mar 30, 2022 @ 10:01:21.313">
  <FlyoutTemplate.Header.MetaBlock title="Last updated">Dec 3, 2025</FlyoutTemplate.Header.MetaBlock>
  <FlyoutTemplate.Header.Badge color="warning" iconType="warning">Urgent</FlyoutTemplate.Header.Badge>
  <FlyoutTemplate.Header.InfoBlock title="Risk score" size="xl" color="danger">90</FlyoutTemplate.Header.InfoBlock>
</FlyoutTemplate.Header>
```

- **`Header.MetaBlock`** — a compact key/value pair, rendered through `@kbn/flyout-meta-blocks`. `title` is the key, rendered bold. `children` is the value, and can hold rich content such as links. The rest of the `MetaBlock` props are also accepted. Use meta blocks for provenance, such as timestamps, owners, or authors.
- **`Header.Badge`** — a status label, rendered through `EuiBadge`. `children` is the label, and the rest of `EuiBadgeProps` is accepted except `iconOnClick` and `iconOnClickAriaLabel`: the icon is decorative, so the badge is a single target rather than two. Labels wider than 200px are truncated with an ellipsis.
- **`Header.InfoBlock`** — a titled value in a responsive grid, rendered through `@kbn/flyout-info-blocks`. `title` is a plain string label and `children` is the value. The rest of the `InfoBlockItem` props are also accepted, including `size` and `color` for emphasizing a headline figure. The number of columns depends on the number of blocks.

All three also take an optional `id`. It identifies the part internally, is generated when omitted, and is not rendered as a DOM id. `data-test-subj` and any `data-*` attributes are passed through to the rendered element.

**Badge overflow.** Up to five badges render inline. With more than five, the first four render inline and the rest collapse behind a `+N more` badge, which opens them in a popover.

**Badges as labels or controls.** A badge is a label by default. Pass `href` (with `target`/`rel`) or `onClick` with `onClickAriaLabel` to make the whole badge navigate or act, which EUI renders as an `<a>` or a `<button>`.

**Badge tooltips.** `toolTipContent` wraps the badge in an `EuiToolTip`, positioned by `toolTipPosition`. A tooltipped badge that is not a link or button gets a tab stop, so keyboard users can open the tooltip. Give it an `aria-label` and `role="img"` so screen readers announce it.

All three groups live in the header's collapsible region. They animate away when the header collapses on scroll, and they never show when `collapsed` is set. Put content that must stay visible in the title or the tab bar.

## Collapse on scroll

### Scroll behavior

When the user scrolls the flyout body, the header collapses to a compact row that shows only the title and its icon. The title shrinks to an `xs` heading on one line, truncated with an ellipsis. A string title shows its full text in a native tooltip on hover. A `ReactNode` title gets no native tooltip, so its own tooltip is not covered. The description, meta blocks, badges, and info blocks slide away, giving the space to the body. The title row, the tab bar, and the divider stay in place in both states.

Scrolling back to the top restores the full header with the same animation in reverse. With `prefers-reduced-motion`, the change is instant.

The mouse wheel scrolls the body from anywhere in the header. Scrolling over the header works, and the page behind the flyout never scrolls with it. Wheel events with a modifier key (Ctrl/Cmd, Alt, Shift) go to the browser, so zoom and horizontal scroll keep working.

The behavior is always on and needs no configuration. It turns itself off when the body does not overflow by more than the collapse budget plus the 4px expansion threshold. The budget is the height of the collapsible content, the expanded title row, and the expanded spacer, so short flyouts are unaffected. A header with no secondary content still collapses, because the title row and spacer shrink on their own.

### Starting collapsed

Set `collapsed` on the header to render the compact row immediately, independent of scroll position:

```tsx
<FlyoutTemplate.Header title="Alert details" collapsed />
```

The description, meta blocks, badges, and info blocks never show in this mode, so there is no reason to declare them. Scroll tracking is off, and the header stays compact however far the body scrolls. Wheel forwarding still works.

## Implementation notes

These notes cover `use_header_collapse.ts` and `header.tsx` for contributors.

### Clip, not remove

The collapsible region uses a CSS grid trick (`grid-template-rows: 0fr / 1fr`) to clip its content without removing it from the DOM. The content stays in the DOM, but its visible height animates to zero and it becomes `aria-hidden`. As a result, `element.scrollHeight` (the natural, unclipped height) stays the same when collapsed, while `getBoundingClientRect().height` follows the animated height.

### Wheel forwarding

The header does not scroll, so `wheel` events over it would normally scroll the page behind the flyout. To prevent this, the hook's `headerRef` callback adds one non-passive `wheel` listener to the `EuiFlyoutHeader` element. Listening on this outer element also covers the header's padding.

`EuiFlyoutHeader` does not forward a ref, so the callback finds it with `closest()`, using the Kibana-owned `FLYOUT_HEADER_CLASS_NAME` class applied in `header.tsx`. EUI's internal `euiFlyoutHeader` class is deliberately not used. The listener calls `event.preventDefault()` and forwards the scroll to the body's scroll container. The header component has no scroll logic of its own. Normal scrolling and forwarded wheel events both reach the same scroll container and run the same RAF-throttled `evaluate()` callback.

The unit of `WheelEvent.deltaY` depends on `deltaMode`, but `scrollBy` only accepts pixels. Firefox's line-mode and page-mode deltas are therefore converted to pixels before being forwarded.

### No oscillation

Collapse triggers at `scrollTop >= 16px` and expansion triggers at `scrollTop <= 4px`. The gap between them keeps the header from flickering when a scroll stops near the boundary.

The overflow guard is only checked when moving _into_ the collapsed state. The collapse budget is a conservative estimate of the space the body gains when the header collapses: the collapsible region's natural height, plus the height of the expanded title row and spacer. The body must overflow by more than this budget plus the 4px expansion threshold.

Once collapsed, the header expands based on scroll position alone. Collapsing the header makes the body taller, which shrinks its scrollable area. Re-checking the guard after collapsing would see the smaller scroll area, decide the header cannot collapse, and expand it again, in an endless loop.

### ResizeObserver roles

The hook uses observers for the scroll-container viewport and the measurements that make up the collapse budget.

**Scroll-container observer** — watches the EuiFlyoutBody overflow div. It re-runs `evaluate()` when that element's own box changes, which covers viewport and flyout layout changes without a window resize listener. A change to descendant content alone may not resize this box. Normal scroll events still evaluate the new scroll geometry.

**Collapse-budget observers** — watch the collapsible region's inner div, the expanded title row, and the expanded spacer. Each reads `node.scrollHeight`, not `contentRect.height`. For the collapsible region this matters: its observed box reports the animated heights down to zero, while `scrollHeight` keeps the natural, unclipped height. The title and spacer observers are attached only while the header is expanded, so their last expanded measurements stay stable during collapse.
