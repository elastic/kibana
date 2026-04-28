# EUI interactive components: accessible names

**Applies to:** `EuiBetaBadge`, `EuiButtonIcon`, `EuiComboBox`, `EuiSelect`, `EuiSuperSelect`, `EuiPagination`, `EuiTreeView`, `EuiBreadcrumbs`

These controls render as interactive elements (buttons, listboxes, pagination, …). Each one must expose an **accessible name** — from visible text via **`aria-labelledby`**, or from **`aria-label`** when no visible label exists.

## Decision order

For every control that needs a name, walk down this list and stop at the first that fits:

1. If **`aria-label`** / **`aria-labelledby`** is already correct, leave it.
2. Prefer a **visible label** — `EuiFormLabel`, `EuiTitle`, `<label>`, nearby heading — and wire it with **`aria-labelledby`** + a stable `id` (use `useGeneratedHtmlId` / `htmlIdGenerator`, see **`../html_ids.md`**). Do **not** duplicate the same text into `aria-label`.
3. Only when no visible label applies, set **`aria-label={i18n.translate(...)}`**.
4. Use **exactly one** naming mechanism — never both `aria-label` and `aria-labelledby` on the same control.

**`EuiFormRow`** already names its direct child — do **not** add redundant `aria-*` to controls inside a form row.

When **`EuiToolTip`** wraps **`EuiButtonIcon`** with matching tooltip text and `aria-label`, see **`tooltip_icon.md`** for the duplicate-screen-reader-output pattern.

## Examples

**Visible label → `aria-labelledby` (preferred)**

```tsx
const fieldLabelId = useGeneratedHtmlId();

<EuiFormLabel id={fieldLabelId}>
  Field (using {bucketAggType} buckets)
</EuiFormLabel>
<EuiComboBox aria-labelledby={fieldLabelId} {...rest} />
```

**No visible label → `aria-label`**

```tsx
<EuiSuperSelect
  aria-label={i18n.translate('myView.options.ariaLabel', {
    defaultMessage: 'Fancy options',
  })}
/>
```

**Pagination / breadcrumbs (no visible label)**

```tsx
<EuiPagination
  aria-label={i18n.translate('results.pagination', {
    defaultMessage: 'Results pagination',
  })}
  pageCount={pageCount}
  activePage={activePage}
  onPageClick={onPageClick}
/>
```

## Common mistakes

```tsx
// WRONG — both naming mechanisms on the same control
<EuiSelect aria-label="Format" aria-labelledby={labelId} />

// RIGHT — prefer aria-labelledby when a visible label exists
<EuiSelect aria-labelledby={labelId} />

// WRONG — EuiFormRow already supplies the name
<EuiFormRow label="Email">
  <EuiFieldText aria-label="Email" />
</EuiFormRow>

// RIGHT
<EuiFormRow label="Email">
  <EuiFieldText />
</EuiFormRow>
```
