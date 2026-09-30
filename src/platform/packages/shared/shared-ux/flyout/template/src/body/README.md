# Body

## Callouts

`Body.Callout` puts a callout in the body's banner, above all other body content. The template renders the callout itself: `level` (`info`, `success`, `warning`, or `danger`) selects one of the `@kbn/ui-callout` components, so nothing but a semantic callout can reach the banner.

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

- **Props** — everything `KbnCalloutProps` takes (`title`, `text`, `actionProps`, `onDismiss`, …) except `size`, `heading`, `className`, `css`, and `style`, which the template owns so every banner callout looks the same. The title stays a `<p>`, out of the flyout's heading outline. `id` is the part's identity, unique among sibling callouts, and is generated when omitted.
- **Visibility** — stays with the consumer: render the callout conditionally, and remove it from `onDismiss`. Give every conditional callout, and the callouts after it, an explicit `id`. A generated `id` follows the callout's position, so removing one callout shifts the generated `id` of each one after it, and those remount.
- **Placement** — any number of callouts render as one stack in source order, with template-owned spacing, wherever they sit among `Body`'s children. Add no `EuiSpacer` around them. The banner scrolls with the body content.
- **Tabs** — a callout directly under `Body` is flyout-wide and stays in place across tab switches. A callout inside a `Body.TabPanel` renders nothing; nothing warns about it.

The body stays mounted across tab switches, and each callout is memoized, so a switch neither remounts nor re-renders a callout. With uncontrolled tabs (`defaultSelectedTabId`) this holds on its own. With controlled tabs (`selectedTabId` and `onTabChange`) the consumer re-renders on every switch and builds new callout elements, so the callout skips its re-render only while its props are shallowly equal: memoize `actionProps` and handlers such as `onDismiss`, or memoize the `<FlyoutTemplate.Body.Callout>` elements themselves.

## Sections

`Body.Section` and `Body.Accordion` give body content a title and consistent spacing. Pick one style per flyout — mixing sections and accordions in the same body is not supported. Both accept `Subsection` children for a second level.

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

- **`Body.Section`** — takes `title`, and optional `icon`, `tooltip`, `action`, `hasBorder`, `id`, `data-test-subj`. Renders a `<section>` with an `<h4>` title, named by that title so assistive tech exposes it as a region. `id` seeds the section's DOM id and is generated when omitted.
- **`Body.Accordion`** — the collapsible variant. Same title-row props plus `initialIsOpen`; `id` seeds the toggle's DOM id and is generated when omitted. Its content is always outlined, so it takes no `hasBorder`.
- **`Subsection`** — reached as `Body.Section.Subsection` or `Body.Accordion.Subsection` (the same component; it is not exposed as `Body.Subsection`). Takes `title`, `id`, `data-test-subj`, and renders an `<h5>`. `id` lands on the wrapper as a link or scroll target; unlike a section, a subsection is not named as its own region.

An `id` also doubles as the part's identity within its parent, so it must be unique among sibling parts of the same kind.

`Subsection` deliberately has no `hasBorder` prop. The border lands on the innermost container, so the parent decides: with subsections present, the outer section drops its border and each subsection carries one instead. Under `Body.Section` the subsections inherit the section's authored `hasBorder`; under `Body.Accordion` they are always bordered.

## Unstructured content

The body also takes plain content — a search bar, a filter row, a data grid — with no wrapper part. Callouts belong in the banner, through `Body.Callout`. It renders as-is, in JSX order relative to the sections around it, and gets no title, box, or divider.

```tsx
<FlyoutTemplate.Body>
  <DocumentFilterBar />
  <EuiSpacer size="m" />
  <DocumentGrid />
</FlyoutTemplate.Body>
```

Content the template does not own brings its own spacing, so add an `EuiSpacer` (or equivalent) between blocks and before the first titled section. Sections and accordions accept the same kind of unstructured content alongside subsections.

**Sections and accordions do not nest, and neither takes a `Subsection` at anything other than its immediate top level.** A `Body.Section` or `Body.Accordion` placed inside another one is treated as unstructured content and renders nothing, as does a `Subsection` wrapped in an element rather than sitting directly under its section (a Fragment is fine). Nothing warns about either. Keep the two levels flat: sections or accordions under `Body`, subsections directly under those.

**Sections and passthrough children should not be interleaved.** Source order is always preserved and nothing is dropped, so interleaving renders — but the rule that separates consecutive sections is a CSS adjacent-sibling selector, and any element between two sections breaks the match, silently removing the divider. Nothing detects this. Put passthrough content before or after the run of sections, not between them.
