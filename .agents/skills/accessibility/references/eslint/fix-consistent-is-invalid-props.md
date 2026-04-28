---
name: fix-consistent-is-invalid-props
description: Fixes @elastic/eui/consistent-is-invalid-props — sync EuiFormRow isInvalid to child EuiFieldText, EuiComboBox, EuiSelect, etc.
---

# `@elastic/eui/consistent-is-invalid-props`

1. **`../shared_principles.md`**
2. **[`../components/eui_form_layout.md`](../components/eui_form_layout.md)**

**Manual review:** nested `EuiFormRow` (innermost pair first); child is `{...fieldProps}` — confirm `isInvalid` not already in spread.
