# Buttons that navigate: links styled as buttons

**Applies to:** `EuiButton`, `EuiButtonEmpty`, `EuiLink`, and button-shaped action props (`actionProps.primary` / `actionProps.secondary` on `EuiCallOut`, `EuiBanner`, `EuiToast`)

`EuiButton` and `EuiButtonEmpty` render a `<button>`, or an `<a>` when given `href`. Wrapping an `EuiLink` (or any other control) in one of them produces an `<a>` inside a `<button>`: invalid HTML, two focus stops for one action (the outer button usually does nothing), and assistive tech may announce the wrong role. This is reported by `@elastic/eui/no-nested-interactive-element`.

## Canonical usage

1. **Navigation that should look like a button.** Put `href` (and `target`, if any) directly on the `EuiButton` / `EuiButtonEmpty` and drop the inner `EuiLink`. EUI renders a single `<a>` and adds a secure `rel` for `target="_blank"`.
2. **External destination / new tab.** Buttons have no `external` prop like `EuiLink`, but they support icons like every other EUI button: add `iconType="external"` and `iconSide="right"` (the pattern the EUI team recommends, and the existing Kibana convention). The button does **not** add `EuiLink`'s screen-reader-only "opens in a new tab" text, so do not add `aria-label` to compensate (it would replace the visible label); if that announcement matters more than button styling, use a plain `EuiLink` instead.
3. **Button-shaped action props.** `actionProps` is an object with `primary` (rendered as `EuiButton`) and `secondary` (rendered as `EuiButtonEmpty`) keys, each taking that button's props. `href` and `target` already pass through, so only the icon is missing: add `iconType: 'external'` and `iconSide: 'right'` to the action. Never pass an `EuiLink` as `children`.
4. **Link that should look like a link.** Use `EuiLink` on its own, without a button wrapper. With `target="_blank"` it shows the external icon and announces the new tab by itself.

## Examples

```tsx
// RIGHT — one <a>, styled as a button, with the external cue
<EuiButtonEmpty href={docsUrl} target="_blank" iconType="external" iconSide="right">
  {learnMoreLabel}
</EuiButtonEmpty>;

// RIGHT — the same pattern through a callout's action props
<EuiCallOut
  title={title}
  actionProps={{
    primary: {
      children: 'Some link',
      href: '/',
      iconType: 'external',
      iconSide: 'right',
    },
    secondary: {
      children: learnMoreLabel,
      href: docsUrl,
      target: '_blank',
      iconType: 'external',
      iconSide: 'right',
    },
  }}
/>;

// RIGHT — a plain link; EuiLink adds the external icon and new-tab SR text itself
<EuiLink href={docsUrl} target="_blank">
  {learnMoreLabel}
</EuiLink>;
```

## Common mistakes

```tsx
// WRONG — <a> nested inside <button>; the outer button is an empty focus stop
<EuiButtonEmpty>
  <EuiLink href={docsUrl} target="_blank">
    {learnMoreLabel}
  </EuiLink>
</EuiButtonEmpty>;

// WRONG — same nesting through action props
<EuiCallOut
  title={title}
  actionProps={{ primary: { children: <EuiLink href={docsUrl}>{label}</EuiLink> } }}
/>;
```
