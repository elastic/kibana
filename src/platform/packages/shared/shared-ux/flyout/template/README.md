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

The root forwards a fixed subset of `EuiFlyoutProps` — `onClose`, `size`, `minWidth`, `maxWidth`, `type`, `paddingSize`, `ownFocus`, `resizable`, `onResize`, `session`, `historyKey`, `onActive`, `flyoutMenuProps` — plus `aria-label`, `aria-labelledby`, and `data-test-subj`. Anything not in that list is not accepted. `size` defaults to `m` and `session` defaults to `start`; `flyoutMenuDisplayMode` is fixed to `auto` and is not configurable.

## Zones

**`FlyoutTemplate.Header`** renders three stacked regions: an always-visible title row, a collapsible region holding the description, and an always-visible trailing region with the full-bleed bottom divider.

- `title` — required `ReactNode`. Rendered as an `<h3>` carrying a generated id.
- `titleIcon` — EUI icon type rendered after the title. Without `titleTooltip` it is decorative (`aria-hidden`).
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip` using `titleIcon` as its type, defaulting to `info`.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. Not wrapped in a `<p>`, so block content is valid.
- `collapsed` — renders the compact layout permanently, regardless of scroll position. See "Header collapse".
- `children` — reserved for future header parts. No header parts exist yet, so any child is dropped.

**`FlyoutTemplate.Body`** renders arbitrary children inside `EuiFlyoutBody` in source order, with no sectioning, titling, or dividers added by the template. Each child manages its own layout.

**`FlyoutTemplate.Footer`** renders `PrimaryAction` and `SecondaryAction` right-aligned inside `EuiFlyoutFooter`, secondary first. If neither action is present, the footer is omitted entirely — no default Cancel button is added. Only the first instance of each action is rendered.

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as an `EuiButton`, filled.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.

Both actions take `label`, `onClick`, and optional `id`, `iconType`, `isLoading`, `isDisabled`, `data-test-subj`. The `id` is forwarded to the button element.

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

## Test subjects

Zone subjects derive from the root `data-test-subj` prop with a zone suffix, and each zone's own `data-test-subj` overrides it. With no root `data-test-subj`, zones get none unless set explicitly.

| Zone | Default subject | Override prop |
| --- | --- | --- |
| Header | `${root}Header` | `FlyoutTemplate.Header` `data-test-subj` |
| Body | `${root}Body` | `FlyoutTemplate.Body` `data-test-subj` |
| Footer | `${root}Footer` | `FlyoutTemplate.Footer` `data-test-subj` |

Footer action buttons are not derived; their `data-test-subj` passes through to the button as given.
