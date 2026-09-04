# Kibana React context

These packages implement Kibana's theme, i18n, and analytics React context. Plugin apps should not import them.

For ad-hoc mounts (portals, `ReactDOM.createRoot`, tests), wrap the tree with `core.rendering.addContext`. See [`@kbn/core-rendering-browser`](../../../../../core/packages/rendering/browser/README.md).

| Package | Role |
| --- | --- |
| `@kbn/react-kibana-context-root` | Used once at the application root by RenderingService. Storybook and Jest only if you are building that root. |
| `@kbn/react-kibana-context-render` | What `addContext` uses internally. Do not import it; the export is deprecated. |
| `@kbn/react-kibana-context-theme` | Override the theme for a subtree. Must sit under an existing Kibana/EUI provider. |
| `@kbn/react-kibana-context-env` | Internal to root. In app code, use `@kbn/react-env`. |
| `@kbn/react-kibana-context-styled` | Compatibility for old `styled-components`. Do not use in new code. Emotion and styled-components Babel plugins conflict. |
| `@kbn/react-kibana-context-common` | Shared types. |

Do not nest `KibanaRootContextProvider` or `KibanaRenderContextProvider`. Nesting mounts a second `EuiProvider` and breaks styling and focus.
