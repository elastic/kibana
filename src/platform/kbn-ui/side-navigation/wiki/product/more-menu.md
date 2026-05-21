# More menu

## Overview

**More** is the overflow affordance for primary items that do not fit in the visible column or exceed the first-level item budget. It is not a normal primary destination — treat it as a grouping mechanism.

## When More appears

1. **Item count:** More than **12** first-level entries (the solution logo / home is **excluded** from this count):
   - Exactly **12** visible items → all shown, no More.
   - **13** items → **11** visible + remainder grouped under More.
2. **Vertical space:** When the viewport or nav height cannot fit all items, they fold into More **one by one** (responsive overflow), until all items that don't fit are grouped under it.

## Behavior differences

| Aspect | Typical primary popover | More menu |
| --- | --- | --- |
| Open trigger | Hover (300ms delay) | Click; stays open until click outside |
| Nested children | Secondary panel or popover | Right arrow opens **another level of nesting inside the same popover** |
| Icon | Product-specific | Three-dot (ellipsis) icon |

Nested levels inside the More popover keep deep IA reachable in **collapsed** mode without a persistent secondary panel.

![Placeholder: More menu with nested level](../assets/more-menu-nested-placeholder.png)

*Suggested asset: More popover open, showing a nested submenu row with a right arrow indicator.*
