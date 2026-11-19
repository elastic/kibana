---
navigation_title: Developer toolbar
---

# @kbn/ui-developer-toolbar [kbn-ui-developer-toolbar]

The developer toolbar is a dev-only bar pinned to the bottom of the page. The package is self-contained so it can be distributed to external consumers (for example, Cloud UI) alongside {{kib}} itself.

In {{kib}}, the `developerToolbar` plugin (`src/platform/plugins/shared/developer_toolbar`) mounts the toolbar and exposes the `registerItem` API. Apps should use that API rather than importing this package directly.

## Development [kbn-ui-developer-toolbar-development]

See [Development](index.md#kbn-ui-development) for how to run the shared Storybook and preview these docs. Run this package's tests with:

```bash
pnpm test:jest src/platform/kbn-ui/developer-toolbar
```

Build the standalone tarball with:

```bash
bash src/platform/kbn-ui/developer-toolbar/packaging/scripts/build.sh
```
