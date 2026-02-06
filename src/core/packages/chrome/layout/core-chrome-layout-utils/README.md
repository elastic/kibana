# @kbn/core-chrome-layout-utils

Scroll utilities for Kibana's layout system.

## Overview

All scroll utilities work with `ScrollContainer` (an `HTMLElement`). The main scroll container is automatically detected by `getScrollContainer()`:
- Returns the element with ID `APP_MAIN_SCROLL_CONTAINER_ID` if found
- Falls back to `document.documentElement` for window scrolling

All scroll methods accept an optional `container` parameter to use a different scroll target.

## Methods

### Container Management
- `getScrollContainer(): ScrollContainer` - Get the main application scroll container (app scroll or document.documentElement)

### Scroll Methods
- `scrollTo(opts, container?)` - Scroll to a specific position
- `scrollToTop(opts?, container?)` - Scroll to the top
- `scrollToBottom(opts?, container?)` - Scroll to the bottom
- `scrollBy(opts, container?)` - Scroll by a relative amount (positive = down, negative = up)

All scroll methods accept `behavior?: ScrollBehavior` option for 'auto' (instant) or 'smooth' scrolling.

### Measurement Methods
- `getScrollPosition(container?): number` - Get current scroll position (scrollTop)
- `getViewportHeight(container?): number` - Get visible viewport height
- `getViewportBoundaries(container?): { top: number; bottom: number }` - Get viewport boundaries (useful for checking element visibility)
- `getScrollDimensions(container?): { scrollTop, scrollHeight, clientHeight }` - Get all scroll dimensions at once

### Utility Methods
- `isAtBottomOfPage(container?): boolean` - Check if scrolled to bottom (with 1px tolerance)

## See also

- [Layout overview](../layout_overview.mdx) - Architecture and data flow
