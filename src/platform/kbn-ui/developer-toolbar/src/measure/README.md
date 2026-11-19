# Copied `@kbn/design-tools` helpers

The files listed below are **copies** of `@kbn/design-tools` (`src/platform/packages/shared/kbn-design-tools/src/`) at upstream commit `28ca927b2ae7`, kept at the same relative paths.

The measure tool needs them, but the edit, layout and font inspect tools in `@kbn/design-tools` use them too, so they cannot move out of that package, and this portable package may not import `@kbn/design-tools`. The copy is temporary until the helpers have a home both packages may depend on.

## Copied files

Source:

- `components/global_cursor_override.tsx`
- `components/tool_toggle_button.tsx`
- `hooks/use_escape_key.ts`
- `hooks/use_overlay_pointer_events.ts`
- `hooks/use_overlay_z_index.ts`
- `hooks/use_shortcut_toggle.ts`
- `lib/constants.ts`
- `lib/dom/build_highlight_css.ts`
- `lib/dom/clamp_to_viewport.ts`
- `lib/dom/get_element_from_point.ts`
- `lib/dom/is_ignored_element.ts`
- `lib/inspection_overlay_state.ts`
- `lib/keyboard_shortcuts.ts`

Tests:

- `components/global_cursor_override.test.tsx`
- `components/tool_toggle_button.test.tsx`
- `hooks/use_overlay_pointer_events.test.ts`
- `hooks/use_shortcut_toggle.test.ts`
- `lib/dom/clamp_to_viewport.test.ts`
- `lib/dom/get_element_from_point.test.ts`
- `lib/dom/is_ignored_element.test.ts`
- `lib/keyboard_shortcuts.test.ts`

## Modified since the copy

None.
