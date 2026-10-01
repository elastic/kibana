# @kbn/flyout-sections

Prop-driven primitives for flyout body content. Three components: a section, its
collapsible variant (accordion), and a subsection for nesting within either.

## Components

### `FlyoutSection`

A titled content block rendered as `<section>` with an `<h4>` heading.

```tsx
import { FlyoutSection } from '@kbn/flyout-sections';

<FlyoutSection title="Summary">
  <AlertSummary alert={alert} />
</FlyoutSection>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` | — | Section heading (rendered as `<h4>`). |
| `icon` | `EuiIconProps['type']` | — | Icon beside the title. Defaults to `info` when `tooltip` is set. |
| `tooltip` | `ReactNode` | — | Tooltip shown from the icon. |
| `action` | `FlyoutSectionAction` | — | Link aligned to the right of the title row. |
| `hasBorder` | `boolean` | `false` | Wraps content in an outlined `EuiPanel`. |
| `data-test-subj` | `string` | — | Test subject on the `<section>` element. |
| `children` | `ReactNode` | — | Section body. |

### `FlyoutAccordion`

The collapsible variant of a section. The title is rendered in `EuiAccordion`'s button
with a `<span>` (not `<h4>`) to keep heading elements out of the button's phrasing
content. Content defaults to bordered (`hasBorder={true}`).

```tsx
import { FlyoutAccordion } from '@kbn/flyout-sections';

<FlyoutAccordion title="Advanced settings" initialIsOpen>
  <SettingsForm />
</FlyoutAccordion>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | Seeds the accordion's DOM id; auto-generated when omitted. |
| `title` | `ReactNode` | — | Accordion heading (rendered in the toggle button as `<span>`). |
| `icon` | `EuiIconProps['type']` | — | Icon beside the title. |
| `tooltip` | `ReactNode` | — | Tooltip shown from the icon. |
| `action` | `FlyoutSectionAction` | — | Link aligned to the right of the title row. |
| `initialIsOpen` | `boolean` | `false` | Opens after the initial render. |
| `hasBorder` | `boolean` | `true` | Wraps content in an outlined `EuiPanel`. |
| `data-test-subj` | `string` | — | Test subject on the `EuiAccordion` element. |
| `children` | `ReactNode` | — | Accordion body. |

### `FlyoutSubsection`

A titled content block nested inside a `FlyoutSection` or `FlyoutAccordion`.

```tsx
import { FlyoutSection, FlyoutSubsection } from '@kbn/flyout-sections';

<FlyoutSection title="Configuration">
  <FlyoutSubsection title="Runtime" hasBorder>
    <RuntimeDetails />
  </FlyoutSubsection>
  <FlyoutSubsection title="Environment" hasBorder>
    <EnvDetails />
  </FlyoutSubsection>
</FlyoutSection>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `ReactNode` | — | Subsection heading (rendered as `<h5>`). |
| `hasBorder` | `boolean` | `false` | Wraps the subsection in an outlined `EuiPanel`. |
| `data-test-subj` | `string` | — | Test subject on the wrapper element. |
| `children` | `ReactNode` | — | Subsection body. |

## Sibling dividers

Consecutive sections (or consecutive accordions) separate themselves with CSS using
`[data-flyout-section] + &` sibling selectors. No wrapper or manual spacing is needed.

- Between **non-bordered** siblings: a thin horizontal rule with `size.m` margin above and
  below (matching `EuiHorizontalRule margin="m"`).
- Between a **bordered** preceding sibling and the next: `size.m` margin only (matching
  `EuiSpacer size="m"`).

For accordions the rule applies while the preceding accordion is **closed**; it is suppressed
while it is open (the panel itself provides the visual separation).

No `showBottomDivider` prop is exposed.

### Mixing `FlyoutSection` and `FlyoutAccordion` as siblings

**Not supported.** A flyout body should contain only `FlyoutSection` components or only
`FlyoutAccordion` components — not both in the same container.

Using `FlyoutSubsection` or arbitrary content nodes between sections or accordions is fine.
The sibling selectors are keyed on the `data-flyout-section` attribute, so unstructured blocks
in between simply break the selector chain without breaking layout.

The CSS degrades gracefully — the margin and divider rules still fire via the shared
`[data-flyout-section]` attribute — but the visual result is not guaranteed to match the
design spec.