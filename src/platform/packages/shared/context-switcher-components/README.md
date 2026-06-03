# @kbn/context-switcher-components

## Components

**ContextSwitcher**

Root component. Renders a trigger button that opens a popover with either:
- A **spaces list** (when no `environmentContext` is provided): selectable list of spaces.
- A **two-step menu** (when `environmentContext` is provided): root menu with environment row + spaces row, each navigating to their respective subviews.

## Storybook

```bash
node scripts/storybook context_switcher_components
```