# Footer (bottom primary menu)

## Overview

Footer items live at the **bottom** of the primary column. They behave like top primary items but are reserved for **utilities and supplementary** actions (Settings, Stack Management, help, and similar).

## Guidelines

- **Recommended count:** up to **3** items; hard cap **5** (`MAX_FOOTER_ITEMS` in code).
- **Icons must stand alone** — labels are hidden in expanded mode, so metaphors must be obvious. The gear icon for Settings is the reference pattern.
- **Tooltips:** always show the label on hover, even when the item has no children.
- **Popover alignment:** child popovers align to the **bottom** of the footer trigger, unlike top primary items where alignment is to the top.

## Placement consistency

Equivalent utilities should occupy the **same relative position** across solutions (for example, Settings always at the very bottom) so muscle memory transfers between Elasticsearch, Observability, and Security.
