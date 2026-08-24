# SharedUX Flyout System Examples

A Kibana example plugin to demonstrate the SharedUX Flyout System.

## Overview

This plugin provides example widgets demonstrating different approaches to flyouts in Kibana:

1. **Widget 1**: Flyouts with `EuiFlyout` component (session-based and non-session-based)
2. **Widget 2**: Flyouts with `core.overlays.openSystemFlyout` (session-based) and `core.overlays.openFlyout` (non-session-based)
3. **Widget 3**: Flyout pagination examples for same-root and cross-root rendering

## Pagination

`FlyoutWithPagination` demonstrates menu-bar pagination for a list of 6 mock documents. Prev/Next controls move between documents, and the menu bar shows the current position (for example, "2 of 6").

The example includes two synchronization patterns, based on whether the flyout body and menu bar share a React root:

- **Same-root API (`EuiFlyout`)** — pass `flyoutMenuProps.pagination` directly and keep pagination state in local React state.
- **Cross-root API (`openSystemFlyout`)** — call `getFlyoutManagerStore().setPagination()` from the external root and read pagination with `useSyncExternalStore` to keep body content synchronized.
