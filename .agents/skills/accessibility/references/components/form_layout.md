# EUI form layout: `EuiFormRow` and invalid state

**Applies to:** `EuiFormRow`, `EuiFieldText`, `EuiFieldNumber`, `EuiFilePicker`, `EuiComboBox`, `EuiTextArea`, `EuiSelect`

`EuiFormRow` wires the **label**, **hints**, and **error** to its child control. Assistive technology and visual error styling stay consistent only when the **child control’s `isInvalid`** matches the **row’s `isInvalid`**.

## Canonical usage

- When **`EuiFormRow`** has **`isInvalid={…}`**, the **direct child** uses the **same expression** for **`isInvalid`**.
- Row without **`isInvalid`** → child does not need it either.
- Typical children: `EuiFieldText`, `EuiFieldNumber`, `EuiFilePicker`, `EuiComboBox`, `EuiTextArea`, `EuiSelect`, `EuiFormControlLayoutDelimited`, `SingleFieldSelect`.
- For nested `EuiFormRow`, sync the **innermost** parent–child pair first.
- If the child is **`{...fieldProps}`**, confirm `isInvalid` is not already in the spread before adding another.
- **`isInvalid`** is a boolean — **no i18n** on it. Visible **`label`** / **`error`** text uses `i18n.translate` when added or changed.

## Examples

```tsx
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} isInvalid={!!errors.name} />
</EuiFormRow>
```

## Common mistakes

```tsx
// WRONG — row marks invalid, child does not
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} />
</EuiFormRow>

// RIGHT — same expression on both
<EuiFormRow label="Name" isInvalid={!!errors.name} error={errors.name}>
  <EuiFieldText value={name} onChange={setName} isInvalid={!!errors.name} />
</EuiFormRow>
```
