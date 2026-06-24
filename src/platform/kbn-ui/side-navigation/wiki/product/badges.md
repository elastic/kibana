# Badges

## Overview

Badges mark **beta**, **tech preview**, or **new** capabilities in navigation. They improve feature discoverability without changing the information architecture.

## Badge types

Navigation badges are visual indicators that highlight new or experimental capabilities and improve feature discoverability. Three indicator styles are used:

| Type | Visual | Typical use |
| --- | --- | --- |
| `new` | **Dot indicator** on primary items; **"New"** text badge on secondary items (and on More popover headers when a primary parent is new) | Genuinely new **pages** added to navigation |
| `beta` | Icon-only badge next to the label (primary or secondary) | Features in beta |
| `techPreview` | Icon-only badge next to the label (primary or secondary) | Features in tech preview |

### Dot indicator (`new` on primary items)

A small dot overlay on primary menu items. It appears when that primary item or any of its children is marked `badgeType: 'new'`.

### "New" text badge (`new` on secondary items)

A text badge with the label "New" beside the secondary item, or beside the popover title when a primary item with children is marked new.

## Placement by item type

### Primary menu item — top area

| Scenario | Expanded mode | Collapsed mode |
| --- | --- | --- |
| Has children (opens popover) | Badge appears in the **popover header**, next to the item label | Badge appears in the **tooltip** next to the label |
| No children, label visible (top, expanded) | Badge appears in the **tooltip** only | Badge appears in the **tooltip** next to the label |

### Primary menu item — footer (bottom)

Labels are always hidden for footer items, so the badge always appears in the **tooltip** next to the label.

### Secondary menu item

The badge is always placed **next to the item name**.

## Usage

Add `badgeType` to any `MenuItem` or `SecondaryMenuItem` in the navigation structure (see [api-reference](../engineering/api-reference.md)).

## "New" badge rules

- Use only for **pages that are genuinely new** in the nav tree — not for new features inside an existing page; announce those on the page itself.
- Do **not** use "New" when a page only moved to a different spot in the menu. This can mislead users into thinking a new capability exists when it doesn't.

### Auto-dismiss behavior (`badgeType: 'new'` only)

Both the dot indicator and the "New" text badge follow the same lifecycle:

1. **User visits** — user clicks a navigation item that shows a "new" badge.
2. **Badge persists** — the badge stays visible while the user remains on that page.
3. **Auto-dismiss** — when the user navigates away, the badge disappears permanently for that item.

Visited items are tracked in `localStorage` (`core.chrome.sidenav.newItems`).

### Maximum limits (`badgeType: 'new'` only)

To prevent badge overload:

- **Max 2 new primary items** can show dot indicators at once (top and footer navigation combined).
- **Max 2 new secondary items per parent** can show "New" text badges at once.

Engineering detail: set `badgeType` on `MenuItem` / `SecondaryMenuItem`; see [api-reference](../engineering/api-reference.md).
