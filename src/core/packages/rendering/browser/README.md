# `@kbn/core-rendering-browser`

Core's browser rendering service.

Use `addContext` when you create an **independent React root** (`ReactDOM.createRoot`, `ReactDOM.render`, Jest). That root does not inherit Kibana theme, i18n, or analytics from chrome:

```ts
const wrapped = coreStart.rendering.addContext(<MyApplication />);
```

Do not use it for `createPortal` or other children of an existing Kibana provider tree — portals keep the parent context. Wrapping them is detected: a warning is emitted, and another `EuiProvider` is not mounted.

`application.register` does not supply React context. App mounts that call `createRoot`/`render` on `params.element` need `addContext`.

Independent roots vs existing trees, and nested `EuiProvider`: [`kibana_context/README.md`](../../../../platform/packages/shared/react/kibana_context/README.md).
