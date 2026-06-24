# Primary menu

## Overview

The primary menu is the vertical list of top-level solution contexts. It splits into a **top** region (main product areas) and a **bottom** region (utilities). Both share the same interaction model, with a few minor differences for footer items described below.

## Solution logo

The uppermost slot is the **solution logo** (home link). It is not counted toward the 12-item primary cap or the "More" overflow logic.

## Interaction matrix

Primary items behave differently based on whether they have children and which mode is active:

| Item type | Expanded — hover | Expanded — click | Collapsed — hover | Collapsed — click |
| --- | --- | --- | --- | --- |
| No children | No interaction | Gets selected; navigates to landing page | Tooltip with label | Gets selected; navigates to landing page |
| Has children | Shows popover with children (if not selected) | Gets selected; opens first child + secondary panel. Hover popover suppressed for this item while selected. | Shows popover with children | Gets selected; opens first child. Popover with children still accessible on hover. |

After a parent with children is **selected** in expanded mode, hover no longer opens the preview popover for that item — the secondary panel carries navigation instead.

## Popover behavior

- Appears for items with **sections** when previewing children (collapsed mode, or expanded mode before the item is selected).
- **Footer** item popovers align to the **bottom** of the trigger item.
- **Top** items use standard top alignment.
- A 300ms hover delay (`POPOVER_HOVER_DELAY`) avoids accidental opens during cursor movement.

## Top vs bottom (footer) items

| Area | Labels in expanded mode | Tooltip when no children |
| --- | --- | --- |
| Top | Shown | Only in collapsed mode |
| Bottom (footer) | Hidden (icon only) | Always on hover |

Footer items should use **simple, conventional icons** (for example gear for Settings) because labels are not visible in any mode.

## Footer (bottom primary menu)

Footer items live at the **bottom** of the primary column. They behave like top primary items but are reserved for **utilities and supplementary** actions (Settings, Stack Management, help, and similar).

### Guidelines

- **Recommended count:** up to **3** items; hard cap **5** (`MAX_FOOTER_ITEMS` in code).
- **Icons must stand alone** — labels are hidden in expanded mode, so metaphors must be obvious. The gear icon for Settings is the reference pattern.
- **Tooltips:** always show the label on hover, even when the item has no children.
- **Popover alignment:** child popovers align to the **bottom** of the footer trigger, unlike top primary items where alignment is to the top.

### Placement consistency

Equivalent utilities should occupy the **same relative position** across solutions (for example, Settings always at the very bottom) so muscle memory transfers between Elasticsearch, Observability, and Security.

## More menu

**More** is the overflow affordance for primary items that do not fit in the visible column or exceed the first-level item budget. It is not a normal primary destination — treat it as a grouping mechanism.

### When More appears

1. **Item count:** More than **12** first-level entries (the solution logo / home is **excluded** from this count):
   - Exactly **12** visible items → all shown, no More.
   - **13** items → **11** visible + remainder grouped under More.
2. **Vertical space:** When the viewport or nav height cannot fit all items, they fold into More **one by one** (responsive overflow), until all items that don't fit are grouped under it.

### Behavior differences

| Aspect | Typical primary popover | More menu |
| --- | --- | --- |
| Open trigger | Hover (300ms delay) | Click; stays open until click outside |
| Nested children | Secondary panel or popover | Right arrow opens **another level of nesting inside the same popover** |
| Icon | Product-specific | Three-dot (ellipsis) icon |

Nested levels inside the More popover keep deep IA reachable in **collapsed** mode without a persistent secondary panel.

![Placeholder: More menu with nested level](../assets/more-menu-nested-placeholder.png)

*Suggested asset: More popover open, showing a nested submenu row with a right arrow indicator.*

## Planned patterns

- **Sections and dividers** between primary items (future, WIP).
