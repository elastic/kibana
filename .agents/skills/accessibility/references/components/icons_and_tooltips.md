# EUI icons and icon tips: `EuiIcon`, `EuiIconTip`, and `EuiToolTip`

**Applies to:** `EuiIcon`, `EuiIconTip`, `EuiToolTip`

## `EuiIcon`: decorative vs meaningful

Every **`EuiIcon`** is **either decorative or meaningful** — pick one, then mark it accordingly.

- **Decorative.** The icon repeats or ornaments visible text → **`aria-hidden={true}`**. Do not combine **`aria-hidden`** with **`tabIndex`** — focusable nodes must be perceivable.
- **Meaningful.** The icon alone carries information → give it an **accessible name** (`aria-label` with `i18n.translate`, or `aria-labelledby` to visible text). See **`../i18n.md`** and **`../html_ids.md`**.
- **`title`** — only for a **native browser tooltip** on built-in icon types. For **SVG React components** passed as `type`, **`title` is not supported** — use `aria-label` / `aria-labelledby` instead.

## Prefer `EuiIconTip` for "icon + tooltip"

When **`EuiToolTip`** wraps **only** a single **`EuiIcon`**, use **`EuiIconTip`** instead — one component, clearer semantics, better defaults.

- Move supported props (`content`, `position`, `delay`, `title`, `id`, `aria-label`, `data-test-subj`, icon `type` / `color` / `size`).
- **Do not** carry **`tabIndex`** from the old **`EuiIcon`** into **`EuiIconTip`**.
- New tooltip **`content`** / accessible names → **`i18n.translate`**.

**Stay with `EuiToolTip` + `EuiIcon`** when there are multiple tooltip children, the child has `onClick` / handlers `EuiIconTip` doesn't support, or the tooltip uses props `EuiIconTip` cannot accept — escalate manually.

## Examples

**Decorative icon**

```tsx
<EuiFlexItem>
  <EuiIcon type="check" color="success" aria-hidden={true} />
  <span>Completed</span>
</EuiFlexItem>
```

**Meaningful icon**

```tsx
<EuiIcon
  type="warning"
  color="danger"
  aria-label={i18n.translate('myFeature.warningIcon', {
    defaultMessage: 'Warning',
  })}
/>
```

**`EuiIconTip` (preferred over `EuiToolTip` + single `EuiIcon`)**

```tsx
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

// RIGHT — remove aria-hidden, add an accessible name
<EuiIcon
  type="help"
  tabIndex={0}
  aria-label={i18n.translate('x.help', { defaultMessage: 'Help' })}
/>

// WRONG — verbose wrapper for a single icon
<EuiToolTip content="Help">
  <EuiIcon type="questionInCircle" />
</EuiToolTip>

// RIGHT
<EuiIconTip content="Help" type="questionInCircle" />
```
