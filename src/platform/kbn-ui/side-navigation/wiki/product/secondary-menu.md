# Secondary menu

## Overview

The secondary menu is the panel beside the primary bar (expanded mode) or the popover beside an icon (collapsed mode). It lets users switch quickly between pages that share a primary context.

In **expanded mode**, the panel stays visible while the user navigates its items. In **collapsed mode**, it appears on hover only, except the More popover which behaves differently — see [More menu](./more-menu.md).

## When to use

- A primary item owns **multiple destinations** (pages, tools, or grouped links).
- Users frequently move between siblings in the same context (for example Observability → APM → Services).
- Optional **sections** help scan long lists (roughly more than ~10 items, or when group titles add meaning).

## When not to use

- **Product announcements**, release notes, or non-navigation messaging — place those as in-page messages, product announcements in "What's New," or temporary cues.
- **Sparse lists** (only 2–3 items) — use tabs, contextual links, or a richer landing page instead.
- **Duplicate of tabs** — never use tabs and secondary menu items simultaneously to navigate the same set of pages.

## Layout and content

- **Item labels** must match the destination **page title** exactly, so users always know where they are. Avoid using CTAs in page headers when the secondary menu already names the page.
- **Sections** are optional. When used, section titles should clarify the grouping. Ask: would removing the title affect understanding? If not, omit it.
- **External links** (for example Elastic Cloud console) show an external arrow icon and open in a **new browser tab**.

## Section grouping checklist

Use sections when:

- The list is long and static (approximately **more than 10** items).
- Group titles add intent, not decoration.
- There is a clear order rationale: frequency of use, product emphasis, or alphabetical — pick one per navigation area.

## Too little content

Panels with only 2–3 items feel sparse and waste horizontal space. Prefer:

- Tabs on the parent landing page, or
- Contextual links and nested routes without a dedicated secondary shell.

![Placeholder: sparse vs dense secondary panels](../assets/secondary-menu-sparse-dense-placeholder.png)

*Suggested asset: side-by-side comparison — sparse panel (3 items, no sections) vs dense panel with sections and search.*

## Planned functionality

- **Search** in the secondary panel when item count exceeds ~20 (configurable).
- **Scroll** when content height exceeds ~600px.
- **Dynamic blocks** (recent, favorites, custom sections) and contextual CTAs (for example "Add dashboard") — especially in combination with listing pages.
