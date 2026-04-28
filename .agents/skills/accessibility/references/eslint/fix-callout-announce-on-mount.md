---
name: fix-callout-announce-on-mount
description: Fixes @elastic/eui/callout-announce-on-mount — add announceOnMount on conditionally rendered EuiCallOut for screen reader announcements.
---

# `@elastic/eui/callout-announce-on-mount`

1. **`../shared_principles.md`**
2. **[`../components/eui_callouts.md`](../components/eui_callouts.md)**

**Manual review:** `{...props}` on `EuiCallOut` without explicit `announceOnMount`; always-mounted callout (rule should not fire).
