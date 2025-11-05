# @kbn/core-chrome-layout-utils

Scroll utilities for Kibana's layout system.

## Scroll Container Picker

The main scroll container is determined by the `getScrollContainer()` function:
- Returns the element with ID `APP_MAIN_SCROLL_CONTAINER_ID` if it exists
- Falls back to the `window` object if the container element is not found

All scroll methods accept an optional `container` parameter to override this default behavior.

## Methods

### Scroll Methods
- `getScrollContainer(): ScrollContainer` - Get the main scroll container
- `scrollTo(opts, container?)` - Scroll to a specific position
- `scrollToTop(opts?, container?)` - Scroll to the top
- `scrollToBottom(opts?, container?)` - Scroll to the bottom

All scroll methods accept `behavior?: ScrollBehavior` option for controlling scroll animation.

### Viewport Methods
- `getScrollPosition(container?): number` - Get the current scroll position of a container
- `getViewportHeight(container?): number` - Get the visible height of a container's viewport
- `getViewportBoundaries(container?): { top: number; bottom: number }` - Get the top and bottom boundaries of a viewport (useful for visibility checks)

### Type Guards
- `isAppScroll(container): boolean` - Check if a scroll container is an HTMLElement
- `isWindowScroll(container): boolean` - Check if a scroll container is the window object
