# EUI focus and keyboard: interactive controls and tooltip anchors

**Applies to:** `EuiButton`, `EuiButtonIcon`, `EuiLink`, `EuiToolTip`

Built-in interactive EUI controls participate in **sequential focus navigation** (WCAG 2.1.1) automatically — do not interfere with `tabIndex`. Non-interactive children of `EuiToolTip` need an explicit tab stop so keyboard users can reveal the tooltip.

## Canonical usage

- **Interactive EUI controls** (`EuiButton`, `EuiButtonIcon`, `EuiLink`, tabs, …) — never set **`tabIndex={-1}`**. For conditional disabling, use **`disabled`** or conditional render. `tabIndex` is allowed only inside a documented pattern (e.g. roving tabindex) on a component that explicitly opts into it.
- **`EuiToolTip` anchors** — the **direct child** is the keyboard anchor:
  - Already interactive (`EuiButton`, `EuiButtonIcon`, `EuiLink`, anything with `tabIndex` / `href` / `onClick`) → leave as-is.
  - Non-interactive (`EuiText`, `EuiImage`, `EuiBadge` without `onClick`, plain `span`, `EuiIcon`, `EuiHealth`, `EuiAvatar`, …) → add **`tabIndex={0}`**.
- Tooltip **`content`** and any new accessible name uses **`i18n.translate`**.

## Examples

```tsx
<EuiButton disabled={isDisabled} onClick={onSave}>
  Save
</EuiButton>

<EuiToolTip
  content={i18n.translate('myView.infoTooltip', { defaultMessage: 'Info' })}
>
  <EuiText tabIndex={0}>Read only</EuiText>
</EuiToolTip>
```

## Common mistakes

```tsx
// WRONG — removes button from tab order
<EuiButton tabIndex={-1} onClick={onSave}>Save</EuiButton>

// WRONG — keyboard cannot reach the tooltip
<EuiToolTip content="Details">
  <EuiIcon type="iInCircle" />
</EuiToolTip>

// RIGHT
<EuiToolTip content="Details">
  <EuiIcon type="iInCircle" tabIndex={0} />
</EuiToolTip>
```
