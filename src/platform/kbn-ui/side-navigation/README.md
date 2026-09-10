# `@kbn/ui-side-navigation`

Adaptive Kibana side navigation: expanded and collapsed layouts, nested secondary menus, overflow ("More"), and badges.

## Boundaries

This package is a platform implementation. Chrome mounts it. App plugins must not import it — use chrome navigation APIs.

A component-consumer guide exists for hosts that compose this UI (Chrome, Storybook, Cloud packaging). That guide does not make the package a supported plugin dependency. See [Package visibility](../../../../docs-dev/kbn-ui/index.md#kbn-ui-package-visibility).

Consumer guide (props, usage, badges): [`docs-dev/kbn-ui/side-navigation.md`](../../../../docs-dev/kbn-ui/side-navigation.md).

## Architecture

- `Navigation` is the public component. Chrome's project sidenav in `@kbn/core-chrome-browser-components` maps chrome navigation state onto it.
- `NavigationStructure` is `primaryItems`, optional `overflowItems`, and `footerItems`. A primary item may include `sections` of secondary items.
- Collapsed and expanded widths (`COLLAPSED_WIDTH` / `EXPANDED_WIDTH`) are for the chrome layout slot, not for app chrome.
- `new` badge visits persist in `localStorage` under `core.chrome.sidenav.newItems`.
- `packaging/` builds a standalone tarball for Cloud UI. See [`packaging/README.md`](packaging/README.md).

## Development

Shared Storybook and docs preview: [`docs-dev/kbn-ui/index.md`](../../../../docs-dev/kbn-ui/index.md#kbn-ui-development).

```bash
yarn storybook kbn_ui
yarn test:jest src/platform/kbn-ui/side-navigation
```
