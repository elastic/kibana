# Kibana React context

These packages implement Kibana's theme, i18n, and analytics React context. Plugin apps should not import them. Use `core.rendering.addContext` from [`@kbn/core-rendering-browser`](../../../../../core/packages/rendering/browser/README.md).

## Independent roots vs existing trees

React context does not cross React roots.

- **Existing provider tree** — UI that stays in the same React tree as the chrome root (`KibanaRootContextProvider` in RenderingService) already has theme, i18n, and analytics. `ReactDOM.createPortal` keeps the portal in that tree, so it preserves context. Do not wrap a portal with `addContext`.
- **Independent React root** — `ReactDOM.createRoot` / `ReactDOM.render` on a new DOM node starts a new tree. That tree does not inherit the chrome providers. Wrap it with `core.rendering.addContext`.

`application.register` mounts your app into a DOM node. It does not wrap that mount with React context. Typical app mounts create their own root (`ReactDOM.render` / `createRoot` on `params.element`) and must call `addContext` themselves.

| Package | Role |
| --- | --- |
| `@kbn/react-kibana-context-root` | Used once at the application root by RenderingService. Storybook and Jest only if you are building that root. |
| `@kbn/react-kibana-context-render` | What `addContext` uses internally. Do not import it; the export is deprecated. |
| `@kbn/react-kibana-context-theme` | Override the theme for a subtree. Must sit under an existing Kibana/EUI provider. |
| `@kbn/react-kibana-context-env` | Internal to root. In app code, use `@kbn/react-env`. |
| `@kbn/react-kibana-context-styled` | Compatibility for old `styled-components`. Do not use in new code. Emotion and styled-components Babel plugins conflict. |
| `@kbn/react-kibana-context-common` | Shared types. |

## Nested providers

`KibanaRenderContextProvider` (what `addContext` uses) wraps `KibanaRootContextProvider`, which mounts `EuiProvider` when none is present.

Do not put `addContext`, `KibanaRootContextProvider`, or `KibanaRenderContextProvider` inside a tree that already has one. Nesting is detected: a warning is emitted, and another `EuiProvider` is not mounted.

`KibanaThemeProvider` is safe under an existing Kibana/EUI provider: it only overrides the theme for a subtree. If it has no parent `EuiProvider`, it mounts one as a fallback and emits a warning.
