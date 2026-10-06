# Body

## Callouts

`Body.Callout` puts a callout in the body's banner, above all other body content. The template renders the callout itself. The `level` prop (`info`, `success`, `warning`, or `danger`) picks one of the `@kbn/ui-callout` components, so only a semantic callout can appear in the banner.

```tsx
<FlyoutTemplate.Body>
  <FlyoutTemplate.Body.Callout level="warning" title="Rule is disabled" text="…" />
  <FlyoutTemplate.Body.Callout
    level="danger"
    title="3 actions failed"
    actionProps={{ primary: { children: 'Retry', onClick: onRetry } }}
  />
  <FlyoutTemplate.Body.Section title="Summary">…</FlyoutTemplate.Body.Section>
</FlyoutTemplate.Body>
```

- **Props** — everything `KbnCalloutProps` takes (`title`, `text`, `actionProps`, `onDismiss`, …) except `size`, `heading`, `className`, `css`, and `style`. The template sets those so every banner callout looks the same. The title is a `<p>`, so it stays out of the flyout's heading outline. `id` identifies the part, must be unique among sibling callouts, and is generated when omitted.
- **Visibility** — you control it. Render the callout conditionally, and remove it in `onDismiss`. Give every conditional callout, and every callout after it, an explicit `id`. A generated `id` is based on the callout's position, so removing one callout changes the generated `id` of each callout after it, and those callouts remount.
- **Placement** — all callouts render as one stack, in source order, with template-owned spacing, wherever they appear among `Body`'s children. Do not add `EuiSpacer` around them. The banner scrolls with the body content.
- **Tabs** — a callout directly under `Body` applies to the whole flyout and stays in place across tab switches. A callout inside a `Body.TabPanel` renders nothing, and nothing warns about it.

The body stays mounted across tab switches, and each callout is memoized, so switching tabs does not remount or re-render a callout. With uncontrolled tabs (`defaultSelectedTabId`), this works on its own. With controlled tabs (`selectedTabId` and `onTabChange`), your component re-renders on every switch and creates new callout elements. A callout then skips re-rendering only if its props are shallowly equal. Memoize `actionProps` and handlers such as `onDismiss`, or memoize the `<FlyoutTemplate.Body.Callout>` elements themselves.

## Sections

`Body.Section` and `Body.Accordion` give body content a title and consistent spacing. Both accept `Subsection` children for a second level. They render the components of `@kbn/flyout-sections`, and its [README](../../../sections/README.md) covers their props, heading levels, and dividers. Use one style per flyout. Mixing sections and accordions in the same body is not supported.

```tsx
<FlyoutTemplate.Body>
  <FlyoutTemplate.Body.Section title="Summary" icon="info" tooltip="What this section covers">
    <SummaryContent />
  </FlyoutTemplate.Body.Section>

  <FlyoutTemplate.Body.Section id="details" title="Details">
    <FlyoutTemplate.Body.Section.Subsection title="Host">
      <HostFields />
    </FlyoutTemplate.Body.Section.Subsection>
  </FlyoutTemplate.Body.Section>
</FlyoutTemplate.Body>
```

- **`Body.Section`** renders a `FlyoutSection` and takes its props, except `borderOnChildren`, which the template sets.
- **`Body.Accordion`** renders a `FlyoutAccordion` and takes its props, except `hasBorder`. Its content is always outlined.
- **`Subsection`** renders a `FlyoutSubsection` and takes its props, except `hasBorder`. Use it as `Body.Section.Subsection` or `Body.Accordion.Subsection`. Both names refer to the same component. There is no `Body.Subsection`.

An `id` also identifies the part within its parent, so it must be unique among sibling parts of the same kind.

### Borders

The border goes on the innermost container, and the parent decides whether there is one. That is why `Subsection` has no `hasBorder` prop. When a section or accordion has subsections, it drops its own border and each subsection gets one instead. Under `Body.Section`, subsections are bordered when the section's `hasBorder` is set. Under `Body.Accordion`, subsections are always bordered.

### Structure

**Sections and accordions do not nest, and a `Subsection` must be a direct child of its section or accordion.** A `Body.Section` or `Body.Accordion` inside another one is treated as unstructured content and renders nothing. A `Subsection` wrapped in another element also renders nothing, although a Fragment is fine. Nothing warns about either case. Keep the structure flat: sections or accordions directly under `Body`, and subsections directly under those.

## Unstructured content

The body also accepts plain content, such as a search bar, a filter row, or a data grid, without any wrapper part. It renders as-is, in JSX order with the sections around it, and gets no title, box, or divider. Callouts go in the banner, through `Body.Callout`.

```tsx
<FlyoutTemplate.Body>
  <DocumentFilterBar />
  <EuiSpacer size="m" />
  <DocumentGrid />
</FlyoutTemplate.Body>
```

The template adds no spacing around content it does not own. Add an `EuiSpacer` (or similar) between blocks and before the first titled section. Sections and accordions accept the same kind of unstructured content alongside subsections.

**Do not put unstructured content between sections.** It still renders in source order, but an element between two sections removes the spacing and divider above the second one (see [Content between sections](../../../sections/README.md#content-between-sections)). Put unstructured content before or after the run of sections.
