# Secondary menu

## Overview

The secondary menu is the panel beside the primary bar (expanded mode) or the popover beside an icon (collapsed mode). It lets users switch quickly between pages that share a primary context.

In **expanded mode**, the panel stays visible while the user navigates its items. In **collapsed mode**, it appears on hover only, except the More popover which behaves differently — see [More menu](./primary-menu.md#more-menu).

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

## Listing pages

> **Status: planned / WIP.** This pattern is documented in product IA but not fully enforced by `@kbn/ui-side-navigation` alone. Chrome and app routes must cooperate. Confirm with platform chrome owners before implementing.

Some primary items own **too many children** to list only in the secondary menu. **Listing pages** (for example "All dashboards") provide a full-page index; the secondary menu may be hidden on the landing view and appear when the user drills into a specific child.

### Intended flow

1. User selects a primary item that has listing behavior.
2. User lands on a **catalog / list page** — secondary panel hidden initially.
3. User opens a specific child → secondary menu **appears** for fast sibling switching.
4. User can return to the full list when they need breadth rather than speed.

This approach keeps the secondary menu from feeling overwhelming while still allowing quick switching once the user is in a detail view.

![Placeholder: listing page flow](../assets/listing-pages-flow-placeholder.png)

*Suggested asset: three-step diagram — (1) list page without secondary panel, (2) detail page with panel open, (3) return to list.*

### Relationship with dynamic content

Listing pages often combine with dynamic secondary content like recent pages, favorites, and CTAs (for example "Add dashboard"). See [planned functionality](#planned-functionality) below.

## Planned functionality

- **Search** in the secondary panel when item count exceeds ~20 (configurable).
- **Scroll** when content height exceeds ~600px.
- **Dynamic blocks** (recent, favorites, custom sections) and contextual CTAs (for example "Add dashboard") — especially in combination with listing pages.
