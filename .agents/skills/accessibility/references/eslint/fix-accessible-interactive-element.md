---
name: fix-accessible-interactive-element
description: Fixes @elastic/eui/accessible-interactive-element — remove tabIndex={-1} from interactive EUI components so they stay in keyboard tab order (WCAG 2.1.1).
---

# `@elastic/eui/accessible-interactive-element`

1. **`../shared_principles.md`**
2. **[`../components/eui_focus_and_keyboard.md`](../components/eui_focus_and_keyboard.md)**

**Manual review:** `tabIndex` only from `{...props}` or HOC; do not redesign roving tabindex here.
