# @kbn/flyout-sections

Prop-driven building blocks for flyout body content. There are three components: a section, an accordion (a collapsible section), and a subsection that nests inside either one.

`@kbn/flyout-template` renders these through `FlyoutTemplate.Body.Section`, `FlyoutTemplate.Body.Accordion`, and their `Subsection` parts. The template sets the border props based on each part's children. See the template's [body README](../template/src/body/README.md).

## Components

### `FlyoutSection`

A titled content block, rendered as a `<section>` with an `<h4>` heading. The title names the section, so assistive tech exposes it as a region.

```tsx
import { FlyoutSection } from '@kbn/flyout-sections';

<FlyoutSection title="Summary">
  <AlertSummary alert={alert} />
</FlyoutSection>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | Sets the section's DOM id, and the id of the title that names it. Generated when omitted. |
| `title` | `ReactNode` | — | Section heading (rendered as `<h4>`). |
| `icon` | `EuiIconProps['type']` | — | Icon beside the title. Defaults to `info` when `tooltip` is set. |
| `tooltip` | `ReactNode` | — | Tooltip shown from the icon. |
| `action` | `FlyoutSectionAction` | — | Link aligned to the right of the title row. |
| `hasBorder` | `boolean` | `false` | Wraps content in an outlined `EuiPanel`. |
| `borderOnChildren` | `boolean` | `false` | Marks the section as bordered without wrapping its content, for when bordered subsections carry the border. Requires `hasBorder`. |
| `data-test-subj` | `string` | — | Test subject on the `<section>` element. |
| `children` | `ReactNode` | — | Section body. |

### `FlyoutAccordion`

A section that can be collapsed. The title is rendered inside `EuiAccordion`'s button as a `<span>`, not an `<h4>`, because a button should not contain headings. Content is bordered by default (`hasBorder={true}`).

```tsx
import { FlyoutAccordion } from '@kbn/flyout-sections';

<FlyoutAccordion title="Advanced settings" initialIsOpen>
  <SettingsForm />
</FlyoutAccordion>
```

**Props**

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | — | DOM id of the collapsible content region. The toggle points to it with `aria-controls`. Generated when omitted. |
| `title` | `ReactNode` | — | Accordion heading (rendered in the toggle button as `<span>`). |
| `icon` | `EuiIconProps['type']` | — | Icon beside the title. Defaults to `info` when `tooltip` is set. |
| `tooltip` | `ReactNode` | — | Tooltip shown from the icon. |
| `action` | `FlyoutSectionAction` | — | Link aligned to the right of the title row. |
| `initialIsOpen` | `boolean` | `false` | Opens after the initial render. |
| `isLoading` | `boolean` | `false` | Replaces the title action and the content with a loading spinner. |
| `isLoadingMessage` | `boolean \| ReactNode` | `false` | Shows a loading message in place of the content while `isLoading` is set. Pass a node to customize it. |
| `hasBorder` | `boolean` | `true` | Wraps content in an outlined `EuiPanel`. |
| `data-test-subj` | `string` | — | Test subject on the `EuiAccordion` element. |
| `children` | `ReactNode` | — | Accordion body. |

### `FlyoutSubsection`

A titled content block inside a `FlyoutSection` or `FlyoutAccordion`. Unlike a section, a subsection is not exposed as its own region.

```tsx
import { FlyoutSection, FlyoutSubsection } from '@kbn/flyout-sections';

<FlyoutSection title="Configuration" hasBorder borderOnChildren>
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
| `id` | `string` | — | DOM id of the subsection wrapper, for use as a scroll or link target. |
| `title` | `ReactNode` | — | Subsection heading (rendered as `<h5>`). |
| `hasBorder` | `boolean` | `false` | Wraps the subsection in an outlined `EuiPanel`. |
| `data-test-subj` | `string` | — | Test subject on the wrapper element. |
| `children` | `ReactNode` | — | Subsection body. |

## Sibling dividers

Consecutive sections, or consecutive accordions, space themselves apart with CSS sibling selectors (`[data-flyout-section] + &`). You do not need a wrapper or manual spacing.

- After a **non-bordered** sibling: a thin horizontal rule with `size.m` margin above and below (like `EuiHorizontalRule margin="m"`).
- After a **bordered** sibling: `size.m` margin only (like `EuiSpacer size="m"`).

For accordions, the rule appears only while the accordion before it is **closed**. While that accordion is open, its panel already separates the two.

### Content between sections

The selectors only match a section that comes directly after another section. Any other element in between, such as a filter bar, a callout, or a spacer, breaks the match, and the second section loses both its top margin and its rule. Nothing detects this. Put other content before or after the run of sections, not between them.

### Mixing `FlyoutSection` and `FlyoutAccordion` as siblings

**Not supported.** A flyout body should contain only `FlyoutSection` components or only `FlyoutAccordion` components, not both in the same container.

The margin and divider rules key on the shared `data-flyout-section` attribute, so mixing them still produces reasonable spacing. The result is not guaranteed to match the design spec.