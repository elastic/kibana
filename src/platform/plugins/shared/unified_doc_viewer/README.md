# unifiedDocViewer

This plugin contains services reliant on the plugin lifecycle for the unified doc viewer component (see @kbn/unified-doc-viewer).

## Storybook

Components in this package have [Storybook](https://storybook.js.org/) stories to show examples.

Run `yarn storybook unified_doc_viewer` from the Kibana root to start the local Storybook development server.

Storybooks on main are [published on build](https://ci-artifacts.kibana.dev/storybooks/main/unified_doc_viewer/index.html).

See the [@kbn-storybook documentation](/src/platform/packages/shared/kbn-storybook/README.md) for more information about Kibana integration with Storybook.

### Limitations

* The trace waterfall does not show in components since it's an Embeddable and we're not mocking everything out.
* The "(X% of trace)" component is never rendered because we are not fetching parent span data.
