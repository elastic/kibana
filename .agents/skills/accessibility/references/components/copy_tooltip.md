# EUI copy-to-clipboard tooltip

**Applies to:** `EuiCopy`, `EuiToolTip`, `EuiButtonIcon`

`EuiCopy` **already wraps its render-prop child in an `EuiToolTip`** and uses the **`beforeMessage`** prop as that tooltip's `content` (swapping to `afterMessage` once the text is copied). Wrapping the render-prop child in your own `EuiToolTip` therefore produces two nested tooltips fighting over the same anchor: unpredictable hover/focus behaviour and duplicated screen-reader announcements.

`beforeMessage` is the single source of truth for the copy tooltip.

**Related guides:** **`tooltip_icon.md`** (tooltip + `aria-label` on `EuiButtonIcon`) · **`tooltip_content.md`** (no interactive elements inside tooltip `content` / `title`) · **`focus_and_keyboard.md`** (tooltip anchors).

## Canonical usage

1. Set **`beforeMessage`** on `EuiCopy` with the localized tooltip text. Do **not** add an `EuiToolTip` inside the render prop.
2. The render-prop child still needs its own **accessible name** — keep `aria-label` on an `EuiButtonIcon`, or use visible text on an `EuiButton`. `EuiCopy`'s tooltip provides the *visible* hint, not the accessible name.
3. Because the tooltip comes from `EuiCopy`, `@elastic/eui/tooltip-button-icon-wrap` does **not** ask you to wrap the button — the `EuiCopy` exception applies. The native `title` prop is still forbidden.
4. When you have **no** `beforeMessage`, there is no tooltip at all (`EuiToolTip` suppresses itself on empty content). Then the button inside must be wrapped normally per `tooltip_icon.md` — or, preferably, add a `beforeMessage`.

## Examples

```tsx
const copyLabel = i18n.translate('myFeature.copyValue', {
  defaultMessage: 'Copy value',
});

<EuiCopy textToCopy={value} beforeMessage={copyLabel}>
  {(copy) => (
    <EuiButtonIcon onClick={copy} iconType="copy" aria-label={copyLabel} />
  )}
</EuiCopy>
```

## Common mistakes

```tsx
// WRONG — nested tooltips: EuiCopy's `beforeMessage` tooltip and the child EuiToolTip
<EuiCopy textToCopy={value} beforeMessage="Click to copy">
  {(copy) => (
    <EuiToolTip content="Copy me">
      <EuiButton onClick={copy}>Copy</EuiButton>
    </EuiToolTip>
  )}
</EuiCopy>

// RIGHT — drop the wrapper, move the message into `beforeMessage`
<EuiCopy textToCopy={value} beforeMessage="Copy me">
  {(copy) => <EuiButton onClick={copy}>Copy</EuiButton>}
</EuiCopy>

// WRONG — no `beforeMessage`, so no tooltip exists for sighted users
<EuiCopy textToCopy={value}>
  {(copy) => <EuiButtonIcon onClick={copy} iconType="copy" aria-label="Copy" />}
</EuiCopy>

// WRONG — native `title` is never acceptable, EuiCopy exception or not
<EuiCopy textToCopy={value} beforeMessage="Copy">
  {(copy) => (
    <EuiButtonIcon onClick={copy} iconType="copy" title="Copy" aria-label="Copy" />
  )}
</EuiCopy>

// WRONG — tooltip provided, but the icon button has no accessible name
<EuiCopy textToCopy={value} beforeMessage="Copy">
  {(copy) => <EuiButtonIcon onClick={copy} iconType="copy" />}
</EuiCopy>
```

## Manual-review cases

- **`beforeMessage` from a variable or JSX** — the rule treats it as meaningful and reports a child `EuiToolTip`, but it cannot merge the two messages for you. There is **no autofix**: decide manually which wording survives into `beforeMessage`.
- **Statically empty / falsy `beforeMessage`** (`""`, `{null}`, `{undefined}`, `{false}`) — `EuiCopy` renders no tooltip, so `no-nested-copy-tooltip` stays silent and `tooltip-button-icon-wrap` still demands a wrapper. Prefer supplying a real `beforeMessage` over wrapping.
- **Render prop the rule cannot resolve** — it follows implicit arrow returns, function expressions, and block bodies with an explicit `return` (including an early return). A root element produced any other way (a helper function, a variable, a `map`) is not analyzed; check it yourself.
- **Button passed through the `beforeMessage` prop itself** rather than the render-prop child is not covered by `EuiCopy`'s tooltip and is still reported by `tooltip-button-icon-wrap`.
