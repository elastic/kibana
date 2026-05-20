# Badges

## Overview

Badges mark **beta**, **tech preview**, or **new** capabilities in navigation. They improve feature discoverability without changing the information architecture.

## Badge types

| Type | Visual | Typical use |
| --- | --- | --- |
| `new` | Dot on primary items; "New" text on secondary (and on More popover headers when a primary item is new) | Genuinely new **pages** added to navigation |
| `beta` | Icon badge | Features in beta |
| `techPreview` | Icon badge | Features in tech preview |

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

## "New" badge rules

- Use only for **pages that are genuinely new** in the nav tree — not for new features inside an existing page; announce those on the page itself.
- Do **not** use "New" when a page only moved to a different spot in the menu. This can mislead users into thinking a new capability exists when it doesn't.
- **Max 2** new primary dot indicators at once (including footer items).
- **Max 2** new secondary items per parent can show "New" badges simultaneously.
- After the user **clicks** a `new` item, the badge stays visible while they remain on that page, then **dismisses permanently** when they navigate elsewhere (tracked in `localStorage`).

Engineering: set `badgeType` on `MenuItem` / `SecondaryMenuItem`; see [api-reference](../engineering/api-reference.md).
