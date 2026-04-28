# EUI focus and keyboard: interactive controls and tooltip anchors

**Applies to:** `EuiButton`, `EuiButtonIcon`, `EuiLink`, `EuiToolTip`

## Interactive EUI controls stay in tab order

Built-in interactive EUI controls (buttons, links, icon buttons, tabs, …) participate in **sequential focus navigation** (WCAG 2.1.1). They have an implicit tab stop — do **not** add **`tabIndex={-1}`**.

- For conditional disabling, use **`disabled`** (or conditional render), not **`tabIndex={-1}`**.
- Reach for **`tabIndex`** on these controls only inside a documented, reviewed pattern (e.g. roving tabindex) — and only in components that explicitly opt into it.

```tsx
// Prefer disabled over tabIndex tricks
<EuiButton disabled={isDisabled} onClick={onSave}>
  Save
</EuiButton>
```

## `EuiToolTip` anchors must be focusable

The **direct child** of **`EuiToolTip`** is the keyboard anchor.

- Child **already interactive** (`EuiButton`, `EuiLink`, `EuiButtonIcon`, anything with `tabIndex` / `href` / `onClick`) → leave as-is.
- Child **non-interactive** (`EuiText`, `EuiImage`, `EuiBadge` without `onClick`, plain `span`, `EuiIcon`, `EuiHealth`, `EuiAvatar`, …) → add **`tabIndex={0}`** so keyboard users can reach the tooltip.

Tooltip **`content`** and any new accessible names use **`i18n.translate`**.

```tsx
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
