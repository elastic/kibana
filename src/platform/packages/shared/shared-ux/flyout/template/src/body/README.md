# Body

## Sections

`Body.Section` and `Body.Accordion` give body content a title and consistent spacing. They are alternates of one concept — a body uses one or the other, not both — and both accept `Subsection` children for a second level.

```tsx
<FlyoutTemplate.Body>
  <FlyoutTemplate.Body.Section title="Summary" icon="info" tooltip="What this section covers">
    <SummaryContent />
  </FlyoutTemplate.Body.Section>

  <FlyoutTemplate.Body.Accordion id="details" title="Details" initialIsOpen>
    <FlyoutTemplate.Body.Accordion.Subsection title="Host">
      <HostFields />
    </FlyoutTemplate.Body.Accordion.Subsection>
  </FlyoutTemplate.Body.Accordion>
</FlyoutTemplate.Body>
```

- **`Body.Section`** — takes `title`, and optional `icon`, `tooltip`, `action`, `hasBorder`, `id`, `data-test-subj`. Renders a `<section>` with an `<h4>` title.
- **`Body.Accordion`** — the collapsible variant. Same title-row props plus `initialIsOpen`, and `id` is required for the toggle. Its content is always outlined, so it takes no `hasBorder`.
- **`Subsection`** — reached as `Body.Section.Subsection` or `Body.Accordion.Subsection` (the same component; it is not exposed as `Body.Subsection`). Takes `title`, `id`, `data-test-subj`, and renders an `<h5>`.

`Subsection` deliberately has no `hasBorder` prop. The border lands on the innermost container, so the parent decides: with subsections present, the outer section drops its border and each subsection carries one instead. Under `Body.Section` the subsections inherit the section's authored `hasBorder`; under `Body.Accordion` they are always bordered.

## Unstructured content

The body also takes plain content — a callout, a search bar, a filter row, a data grid — with no wrapper part. It renders as-is, in JSX order relative to the sections around it, and gets no title, box, or divider.

```tsx
<FlyoutTemplate.Body>
  <DocumentFilterBar />
  <EuiSpacer size="m" />
  <DocumentGrid />
</FlyoutTemplate.Body>
```

Content the template does not own also owns its own spacing, so add an `EuiSpacer` (or equivalent) between blocks and before the first titled section. Sections and accordions accept the same kind of content alongside subsections.

**Sections and passthrough children should not be interleaved.** Source order is always preserved and nothing is dropped, so interleaving renders — but the rule that separates consecutive sections is a CSS adjacent-sibling selector, and any element between two sections breaks the match, silently removing the divider. Nothing detects this. Put passthrough content before or after the run of sections, not between them.
