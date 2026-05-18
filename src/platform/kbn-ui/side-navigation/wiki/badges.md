# Badges

## Overview

Visual indicators for **new**, **beta**, or **tech preview** nav entries (`badgeType` on `MenuItem` / `SecondaryMenuItem`).

## Problem it solves

Feature discoverability without cluttering labels.

## When to use / not use

| Use | Don't |
| --- | ----- |
| Genuinely new **pages** | Menu reorder only |
| Beta / tech preview surfaces | In-page-only feature launches |
| Max **2** new primaries and **2** new secondaries per parent (enforced in code) | More "new" items than caps allow |

## Anatomy

| Indicator | When |
| --------- | ---- |
| **Dot** on primary | Primary or any child has `badgeType: 'new'` |
| **"New" text** on secondary | Secondary item (or "new" primary folded under More) |
| **Beta / tech preview icons** | EUI icon badges on primary or secondary |

| `badgeType` | Presentation |
| ----------- | -------------- |
| `new` | Dot + "New" text (see above) |
| `beta` | EUI beta icon |
| `techPreview` | EUI tech preview icon |

**Placement (UX):** primary without children → badge in tooltip when label hidden; with children → near popover/panel title; secondary → beside label.

Set on items: `badgeType: 'new' | 'beta' | 'techPreview'`.

## Behavior

### "New" lifecycle

1. User clicks a "new" item → badge stays while on that page.
2. User navigates elsewhere → badge **removed permanently**.
3. Tracked in `localStorage` (`core.chrome.sidenav.newItems`) via `useNewItems`.

### Limits ("new" only)

- Max **2** new **primary** items (top + footer combined) showing dots.
- Max **2** new **secondary** items per parent showing "New" text.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Follow Elastic badge guidelines for experiment types. | Use "new" for moved pages or hidden in-page features. |

API: [code/api.md](./code/api.md) · Examples: [code/examples.md](./code/examples.md).
