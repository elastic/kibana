# Accessibility

## What the component provides

- **Landmarks and labels:** Primary navigation rendered as a landmark region with an accessible name (`primaryMenuAriaLabel` i18n key).
- **Roving tabindex** on primary controls (`handle_roving_index` utilities) with Arrow Up/Down, Home, End navigation.
- **Set size hints:** `aria-setsize` and `aria-posinset` on primary items, including the More trigger at its correct position.
- **Describedby** links for items with badges or nested popover instructions.
- **Section groups:** Secondary sections use `role="group"` with `aria-labelledby` when a section title exists.
- **Focus management:** More menu panels return focus to the triggering control on close; leaving navigation via certain actions moves focus to main content (`focusMainContent` utility).
- **Footer labels:** Required in the data model for screen reader announcement even when visually hidden.

## What consumers must provide

- Meaningful **`label`** strings on every item, especially footer items where labels are visually hidden.
- **`activeItemId`** aligned with the current route so active state is consistently announced.
- Page **titles** that match secondary menu labels (required for screen reader users to confirm location).
- Do not rely on **color alone** for active or hover state; EUI active styles include shape and weight cues.

## Keyboard summary

| Context | Keys |
| --- | --- |
| Primary menu | Arrow Up/Down move focus; Home/End jump to first/last item |
| More nested panel | Focus trap within panel; Escape / back returns focus to trigger |
| Collapse control | Standard button activation (Enter/Space) |

## Known considerations

- Hover-driven popovers in collapsed mode need equivalent **keyboard** paths via focus and activation — verify in Storybook when changing popover timing or structure.
- External links should communicate that they open in a new window (EUI external link pattern).

Run automated a11y checks in consuming apps where `@kbn/a11y` suites exist for chrome navigation.
