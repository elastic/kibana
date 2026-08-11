# EUI interactive components: accessible names

**Applies to:** `EuiBetaBadge`, `EuiButtonIcon`, `EuiComboBox`, `EuiSelect`, `EuiSuperSelect`, `EuiPagination`, `EuiTreeView`, `EuiBreadcrumbs`

These controls render as interactive elements (buttons, listboxes, pagination, …). Each one needs an **accessible name**. Read *Accessible naming* in **`../shared_principles.md`** for the general rule; this guide adds component-specific notes.

## Canonical usage

Walk the naming hierarchy and stop at the first that fits:

1. Existing `aria-label` / `aria-labelledby` is correct → leave it.
2. **Visible label** (`EuiFormLabel`, `EuiTitle`, `<label>`, nearby heading) → wire with **`aria-labelledby`** + a stable `id` (see *HTML ids* in **`../shared_principles.md`**). Don't duplicate that text into `aria-label`.
3. No visible label → **`aria-label={i18n.translate(...)}`**.

Use **exactly one** mechanism per control — never both `aria-label` and `aria-labelledby`.

- **`EuiFormRow`** already names its direct child — do **not** add redundant `aria-*` to controls inside a form row.
- When **`EuiToolTip`** wraps **`EuiButtonIcon`** with matching tooltip text, see **`tooltip_icon.md`** for the duplicate-screen-reader-output pattern.

## Examples

```tsx
const fieldLabelId = useGeneratedHtmlId();

<EuiFormLabel id={fieldLabelId}>
  Field (using {bucketAggType} buckets)
</EuiFormLabel>
<EuiComboBox aria-labelledby={fieldLabelId} {...rest} />

<EuiSuperSelect
  aria-label={i18n.translate('myView.options.ariaLabel', {
    defaultMessage: 'Fancy options',
  })}
/>

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
