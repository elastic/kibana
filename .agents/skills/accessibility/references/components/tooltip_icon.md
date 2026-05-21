# EUI tooltip on an icon button

**Applies to:** `EuiToolTip`, `EuiButtonIcon`

When **`EuiToolTip`** wraps **`EuiButtonIcon`** and the tooltip **`content`** matches the button's **`aria-label`**, assistive technology can announce the same text twice. Use **`disableScreenReaderOutput`** so the tooltip stays available to sighted users while screen readers hear the name once.

**Related guides:** **`focus_and_keyboard.md`** (tooltip anchors / `tabIndex`) · **`icons_and_tooltips.md`** (`EuiIconTip` vs `EuiToolTip` + `EuiIcon`).

## Canonical usage

- **`content`** equals **`aria-label`** (same string or same variable / same `i18n` call) → set **`disableScreenReaderOutput`** on **`EuiToolTip`**.
- **`content`** differs from **`aria-label`** → no extra prop; both will be announced as intended.
- Child is not **`EuiButtonIcon`** → this pattern doesn't apply; check the related guides above.

Prefer a single **`i18n.translate`** call (same id + `defaultMessage`) for both **`content`** and **`aria-label`** so the strings can't drift apart.

For `{...tooltipProps}` spreads, merge **`disableScreenReaderOutput`** at the callsite or in the spread source.

## Examples

```tsx
<EuiToolTip
  content={i18n.translate('filter.add', { defaultMessage: 'Add filter' })}
  disableScreenReaderOutput
>
  <EuiButtonIcon
    iconType="plusInCircle"
    aria-label={i18n.translate('filter.add', { defaultMessage: 'Add filter' })}
    onClick={onAdd}
  />
</EuiToolTip>
```

## Common mistakes

```tsx
// WRONG — screen reader announces "Add filter" twice
<EuiToolTip content={label}>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>

// RIGHT
<EuiToolTip content={label} disableScreenReaderOutput>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>

// WRONG — different ids, strings may drift apart
content={i18n.translate('a.tooltip', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.button', { defaultMessage: 'Add' })}

// RIGHT — same id keeps them in sync
content={i18n.translate('a.add', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.add', { defaultMessage: 'Add' })}
```
