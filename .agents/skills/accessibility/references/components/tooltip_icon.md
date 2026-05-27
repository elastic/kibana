# EUI tooltip on an icon button

**Applies to:** `EuiToolTip`, `EuiButtonIcon`

Every **`EuiButtonIcon`** needs two things:

1. **A visible tooltip for sighted users** — wrap the button with **`EuiToolTip`**. Do **not** use the native **`title`** prop on `EuiButtonIcon`; browser tooltips are unstyled, have no delay control, and are not keyboard-accessible.
2. **An accessible name for assistive technology** — keep **`aria-label`** on the button.

When the tooltip **`content`** and the button's **`aria-label`** match (same string, same variable, or same `i18n` call), also set **`disableScreenReaderOutput`** on `EuiToolTip` so screen readers announce the name once instead of twice.

**Related guides:** **`focus_and_keyboard.md`** (tooltip anchors / `tabIndex`) · **`icons_and_tooltips.md`** (`EuiIconTip` vs `EuiToolTip` + `EuiIcon`) · **`tooltip_content.md`** (no interactive elements inside tooltip `content` / `title`).

## Canonical usage

1. Wrap every `EuiButtonIcon` with `EuiToolTip`. Remove any `title` prop from the button.
2. Pass the same localized string to `EuiToolTip` `content` and the button's `aria-label`. Prefer a single **`i18n.translate`** call (same id + `defaultMessage`) referenced from both places so the strings cannot drift apart.
3. When `content` and `aria-label` match → add **`disableScreenReaderOutput`** on `EuiToolTip`.
4. When `content` and `aria-label` intentionally differ (the tooltip elaborates beyond the name) → do **not** add `disableScreenReaderOutput`; both will be announced as intended.
5. Child is not `EuiButtonIcon` → this pattern doesn't apply; see the related guides.

For `{...tooltipProps}` / `{...buttonProps}` spreads, merge the props at the callsite or in the spread source.

## Examples

```tsx
const editLabel = i18n.translate('myFeature.editItem', {
  defaultMessage: 'Edit item',
});

<EuiToolTip content={editLabel} disableScreenReaderOutput>
  <EuiButtonIcon
    iconType="pencil"
    aria-label={editLabel}
    onClick={onEdit}
  />
</EuiToolTip>
```

## Common mistakes

```tsx
// WRONG — no visible tooltip for sighted users
<EuiButtonIcon iconType="trash" aria-label="Delete" onClick={onDelete} />

// WRONG — native `title` is not keyboard-accessible
<EuiButtonIcon title="Delete" aria-label="Delete" iconType="trash" onClick={onDelete} />

// RIGHT — wrap and keep `aria-label` for the SR name
<EuiToolTip content="Delete" disableScreenReaderOutput>
  <EuiButtonIcon iconType="trash" aria-label="Delete" onClick={onDelete} />
</EuiToolTip>

// WRONG — screen reader announces "Add filter" twice
<EuiToolTip content={label}>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>

// RIGHT
<EuiToolTip content={label} disableScreenReaderOutput>
  <EuiButtonIcon iconType="plusInCircle" aria-label={label} onClick={onAdd} />
</EuiToolTip>

// WRONG — different i18n ids may drift apart
content={i18n.translate('a.tooltip', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.button', { defaultMessage: 'Add' })}

// RIGHT — same id keeps them in sync
content={i18n.translate('a.add', { defaultMessage: 'Add' })}
aria-label={i18n.translate('a.add', { defaultMessage: 'Add' })}
```
