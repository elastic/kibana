# EUI radio groups: `EuiRadio` and `EuiRadioGroup`

**Applies to:** `EuiRadio`, `EuiRadioGroup`

Radio buttons are **grouped in the accessibility tree** by shared **`name`** values. Without a `name`, browsers and assistive technology cannot treat options as one exclusive set.

## Canonical usage

- Every **`EuiRadio`** and **`EuiRadioGroup`** has a **`name`**.
- Options that belong together share the **same** `name`; distinct groups in one view use **different** names.
- `name` is a **programmatic** token — do **not** wrap it in `i18n` (see *Localization (i18n)* in **`../shared_principles.md`**). Visible **`label`** text **does** use `i18n.translate` when added or changed.
- Naming: **`camelCase`** from field, section, or state (`paymentMethod`, `alertSeverity`). Avoid `radio1`, `group1`, `options`. If the context is genuinely unknown, `optionGroup` is an acceptable last resort — still better than omitting `name`.
- For `{...groupProps}`, verify `name` in the spread source before adding another.

## Examples

```tsx
<EuiRadio
  name="paymentMethod"
  label={i18n.translate('payment.creditCard', { defaultMessage: 'Credit Card' })}
  checked={selected === 'credit'}
  onChange={setSelected}
/>
```

```tsx
<EuiRadioGroup
  name="alertSeverity"
  options={severityOptions}
  idSelected={selectedId}
  onChange={onSeverityChange}
/>
```

## Common mistakes

```tsx
// WRONG — assistive technology cannot group these radios
<EuiRadio label="Option A" checked={selected === 'a'} onChange={onChange} />

// RIGHT
<EuiRadio name="myChoice" label="Option A" checked={selected === 'a'} onChange={onChange} />

// WRONG — name is programmatic, not user-visible
<EuiRadio name={i18n.translate('x.name', { defaultMessage: 'paymentMethod' })} />

// RIGHT
<EuiRadio name="paymentMethod" />
```
