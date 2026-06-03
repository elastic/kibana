# Listing pages

> **Status: planned / WIP.** This pattern is documented in product IA but not fully enforced by `@kbn/ui-side-navigation` alone. Chrome and app routes must cooperate. Confirm with platform chrome owners before implementing.

## Overview

Some primary items own **too many children** to list only in the secondary menu. **Listing pages** (for example "All dashboards") provide a full-page index; the secondary menu may be hidden on the landing view and appear when the user drills into a specific child.

## Intended flow

1. User selects a primary item that has listing behavior.
2. User lands on a **catalog / list page** — secondary panel hidden initially.
3. User opens a specific child → secondary menu **appears** for fast sibling switching.
4. User can return to the full list when they need breadth rather than speed.

This approach keeps the secondary menu from feeling overwhelming while still allowing quick switching once the user is in a detail view.

![Placeholder: listing page flow](../assets/listing-pages-flow-placeholder.png)

*Suggested asset: three-step diagram — (1) list page without secondary panel, (2) detail page with panel open, (3) return to list.*

## Relationship with dynamic content

Listing pages often combine with dynamic secondary content like recent pages, favorites, and CTAs (for example "Add dashboard"). See [secondary menu — planned functionality](./secondary-menu.md#planned-functionality).
