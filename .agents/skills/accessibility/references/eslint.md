# `@elastic/eui` accessibility ESLint rules

Secondary path: when starting from a rule id, jump to the canonical **component guide** that explains the pattern. Read **`shared_principles.md`** first; the manual-review column lists shapes the rule cannot resolve automatically.

| Rule id | Component guide | Manual review |
|---------|-----------------|---------------|
| `@elastic/eui/accessible-interactive-element` | [`components/focus_and_keyboard.md`](components/focus_and_keyboard.md) | `tabIndex` only from `{...props}` or HOC; do not redesign roving tabindex. |
| `@elastic/eui/badge-accessibility-rules` | [`components/interactive_components.md`](components/interactive_components.md) | Direct child of `EuiFormRow` (row supplies name); `{...props}` with unknown `aria-*`. |
| `@elastic/eui/callout-announce-on-mount` | [`components/callouts.md`](components/callouts.md) | `{...props}` on `EuiCallOut` without explicit `announceOnMount`; always-mounted callout (rule should not fire). |
| `@elastic/eui/consistent-is-invalid-props` | [`components/form_layout.md`](components/form_layout.md) | Nested `EuiFormRow` (innermost pair first); child is `{...fieldProps}` — confirm `isInvalid` not already in spread. |
| `@elastic/eui/icon-accessibility-rules` | [`components/icons_and_tooltips.md`](components/icons_and_tooltips.md) | `{...iconProps}` may already include a11y props. |
| `@elastic/eui/no-unnamed-interactive-element` | [`components/interactive_components.md`](components/interactive_components.md) | Direct child of `EuiFormRow` (row supplies name); `{...props}` with unknown `aria-*`. |
| `@elastic/eui/no-unnamed-radio-group` | [`components/radio_groups.md`](components/radio_groups.md) | `{...groupProps}` — verify `name` in spread before adding. |
| `@elastic/eui/prefer-eui-icon-tip` | [`components/icons_and_tooltips.md`](components/icons_and_tooltips.md) | Not a single `EuiIcon` child; icon has `onClick` / unsupported props — skip or escalate. |
| `@elastic/eui/require-aria-label-for-modals` | [`components/overlays.md`](components/overlays.md) | `{...props}` hides wiring; no visible title without UX change — escalate. |
| `@elastic/eui/require-table-caption` | [`components/data_tables.md`](components/data_tables.md) | `tableCaption` only via `{...tableProps}` — fix at source; no duplicate conflicting captions. |
| `@elastic/eui/sr-output-disabled-tooltip` | [`components/tooltip_icon.md`](components/tooltip_icon.md) | `EuiToolTip` props from spread; child not `EuiButtonIcon`. |
| `@elastic/eui/tooltip-focusable-anchor` | [`components/focus_and_keyboard.md`](components/focus_and_keyboard.md) | `{...anchorProps}` or unknown custom anchor. |
