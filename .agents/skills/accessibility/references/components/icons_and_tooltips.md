# EUI icons and icon tips: `EuiIcon`, `EuiIconTip`, and `EuiToolTip`

**Applies to:** `EuiIcon`, `EuiIconTip`, `EuiToolTip`

Each `EuiIcon` is **either decorative or meaningful** — pick one and mark it accordingly. When a tooltip wraps a single icon, `EuiIconTip` is the canonical component.

## When to use which

- **`EuiIcon` alone** — decorative (repeats nearby visible text), or meaningful with its own accessible name.
- **`EuiIconTip`** — the icon needs a tooltip (help, hint, info). One component, clearer semantics, better defaults than `EuiToolTip` + `EuiIcon`.
- **`EuiToolTip` + `EuiIcon`** — only when `EuiIconTip` doesn't fit: multiple tooltip children, child has `onClick` / handlers `EuiIconTip` doesn't support, or the tooltip uses props `EuiIconTip` cannot accept. Otherwise migrate to `EuiIconTip`.

## Canonical usage

- **Decorative** → **`aria-hidden={true}`**. Do **not** combine `aria-hidden` with `tabIndex`; focusable nodes must be perceivable.
- **Meaningful** → give the icon an **accessible name** (`aria-label` or `aria-labelledby`). See *Accessible naming*, *Localization (i18n)*, and *HTML ids* in **`../shared_principles.md`**.
- **`title` is not a substitute.** Native browser tooltip on built-in icon types only — **not supported on SVG React components passed as `type`**.
- **Migrating to `EuiIconTip`** — move supported props (`content`, `position`, `delay`, `title`, `id`, `aria-label`, `data-test-subj`, icon `type` / `color` / `size`). Do **not** carry `tabIndex` over.

## Examples

```tsx
<EuiIcon
  type="warning"
  color="danger"
  aria-label={i18n.translate('myFeature.warningIcon', {
    defaultMessage: 'Warning',
  })}
/>

<EuiFlexItem>
  <EuiIcon type="check" color="success" aria-hidden={true} />
  <span>Completed</span>
</EuiFlexItem>

<EuiIconTip
  content={i18n.translate('myFeature.helpTip', { defaultMessage: 'Help info' })}
  position="right"
  type="questionInCircle"
  aria-label={i18n.translate('myFeature.helpAria', { defaultMessage: 'Help' })}
/>
```

## Common mistakes

```tsx
// WRONG — meaningful icon without an accessible name
<EuiIcon type="warning" color="danger" />

// WRONG — focusable but hidden from assistive technology
<EuiIcon type="help" tabIndex={0} aria-hidden={true} />

// WRONG — verbose wrapper for a single icon
<EuiToolTip content="Help">
  <EuiIcon type="questionInCircle" />
</EuiToolTip>

// RIGHT
<EuiIconTip content="Help" type="questionInCircle" />
```
