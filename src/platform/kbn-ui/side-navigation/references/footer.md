# Footer menu

## Overview

Bottom primary items for utilities (`footerItems`). Same `MenuItem` shape as top primary.

## Problem it solves

Separates global utilities from work-context items; **Settings** stays predictably at the bottom across solutions.

## When to use / not use

| Use | Don't |
| --- | ----- |
| Settings, admin, help (≤ **3** recommended, **5** max) | Core product chapters |

## Anatomy

Up to `MAX_FOOTER_ITEMS` (5). Optional collapse button when `onToggleCollapsed` is set.

## Behavior

- Labels **hidden** in expanded footer; **tooltip on hover** always (`label` still required in data).
- Popovers **bottom-aligned** vs top primary.
- Supports `sections` like top items.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Use conventional icons (e.g. gear). | Hide labels without a recognizable icon. |

Primary interactions: [primary-menu.md](./primary-menu.md).
