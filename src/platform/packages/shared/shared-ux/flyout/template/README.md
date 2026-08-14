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

## Zones

**`FlyoutTemplate.Header`** renders the title row, an optional description, and a full-bleed bottom divider. It accepts only declared header parts as children; free-form content belongs in the Body and triggers a dev warning if placed here.

- `title` — required. Rendered as an `<h3>` with a generated id wired to the flyout's `aria-labelledby`.
- `titleIcon` — EUI icon type for a decorative icon to the left of the title. Rendered without tooltip.
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip`; defaults to the `info` icon type.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. Not wrapped in a `<p>`, so block content is valid.

**`FlyoutTemplate.Body`** renders arbitrary children inside `EuiFlyoutBody` in source order, with no sectioning, titling, or dividers added by the template. Each child manages its own layout.

**`FlyoutTemplate.Footer`** renders `PrimaryAction` and `SecondaryAction` right-aligned inside `EuiFlyoutFooter`. If neither action resolves, the footer is omitted entirely — no default Cancel button is added.

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as a filled `EuiButton`.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.

## Behavior

- The header title is an `<h3>` with a generated id. That id is passed to `EuiFlyout`'s `aria-labelledby`, so the flyout is accessible without a separate `aria-label`. A string title is also forwarded to EUI's flyout menu as the history entry title.
- The header's bottom divider bleeds to the flyout edges using the root `paddingSize`; it aligns with the flyout chrome regardless of which padding size is active.
- `FlyoutTemplate.Body` is required. Omitting it logs a dev warning.
- Duplicate zones (e.g. two `FlyoutTemplate.Header` children) log a dev warning and render only the first.
- The three zone components (`Header`, `Body`, `Footer`) render nothing when used outside a `FlyoutTemplate` root.

## Test subjects

Zone subjects derive from the root `data-test-subj` prop with a zone suffix, and each zone's own `data-test-subj` overrides it:

| Zone | Default subject | Override prop |
| --- | --- | --- |
| Header | `${root}Header` | `FlyoutTemplate.Header` `data-test-subj` |
| Body | `${root}Body` | `FlyoutTemplate.Body` `data-test-subj` |
| Footer | `${root}Footer` | `FlyoutTemplate.Footer` `data-test-subj` |
