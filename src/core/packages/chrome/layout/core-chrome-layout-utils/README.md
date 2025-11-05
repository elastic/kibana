# @kbn/core-chrome-layout-utils

Scroll utilities for Kibana's layout system.

## Scroll Container Picker

The main scroll container is determined by the `getScrollContainer()` function:
- Returns the element with ID `APP_MAIN_SCROLL_CONTAINER_ID` if it exists
- Falls back to the `window` object if the container element is not found

All scroll methods accept an optional `container` parameter to override this default behavior.

## Methods

- `getScrollContainer(): ScrollContainer` - Get the main scroll container
- `scrollTo(opts, container?)` - Scroll to a specific position
- `scrollToTop(opts?, container?)` - Scroll to the top
- `scrollToBottom(opts?, container?)` - Scroll to the bottom

All methods accept `behavior?: ScrollBehavior` option for controlling scroll animation.
