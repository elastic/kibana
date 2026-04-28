---
name: fix-no-unnamed-interactive-element
description: Fixes @elastic/eui/no-unnamed-interactive-element and badge-accessibility-rules — add aria-label or aria-labelledby to unnamed EUI interactive components (EuiButtonIcon, EuiComboBox, EuiPagination, etc.).
---

# `@elastic/eui/no-unnamed-interactive-element` (and `badge-accessibility-rules`)

1. **`../shared_principles.md`**
2. **[`../components/eui_interactive_components.md`](../components/eui_interactive_components.md)**

**Manual review:** direct child of `EuiFormRow` (row supplies name); `{...props}` with unknown `aria-*`.
