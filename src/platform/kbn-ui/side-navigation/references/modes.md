# Expanded & collapsed modes

## Overview

**Expanded** (default): icon + label; persistent secondary panel. **Collapsed:** icon rail; secondary in popovers.

## Problem it solves

Balances discoverability with maximum workspace width.

## When to use / not use

User-controlled via `isCollapsed` (Kibana persists in chrome). Workspace chrome may auto-collapse when app area ≤ ~1000px (outside this package).

## Anatomy

Collapse control in footer when `onToggleCollapsed` provided and not on `xs`/`s` breakpoints.

## Behavior

| | Expanded | Collapsed |
| - | -------- | --------- |
| Primary labels | Visible | Hidden (tooltips) |
| Secondary | Side panel if `sections` | Popovers |
| Width reported | `EXPANDED_WIDTH` 100 (+ 248 panel) | `COLLAPSED_WIDTH` 48 |
| Mobile `xs`/`s` | Forced collapsed | Forced collapsed |

Parent owns `isCollapsed`; call `setWidth` so layout grid updates.

## Do / Don't

| Do | Don't |
| -- | ----- |
| Wire collapse to layout. | Assume secondary panel visible when collapsed. |

Constants: [code/api.md](./code/api.md).
