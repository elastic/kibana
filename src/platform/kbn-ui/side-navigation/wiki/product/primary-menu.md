# Primary menu

## Overview

The primary menu is the vertical list of top-level solution contexts. It splits into a **top** region (main product areas) and a **bottom** region (utilities). Both share the same interaction model, with a few minor differences for footer items described in [footer](./footer.md).

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

## Planned patterns

- **Sections and dividers** between primary items (future, WIP).
- **Content-driven navigation / listing pages** — see [listing pages](./listing-pages.md).
