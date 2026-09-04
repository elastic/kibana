# `@kbn/core-rendering-browser`

Core's browser rendering service.

Ad-hoc React mounts (portals, `ReactDOM.createRoot`, tests) do not automatically receive Kibana theme, i18n, or analytics context. Wrap the tree with `core.rendering.addContext`:

```ts
const wrapped = coreStart.rendering.addContext(<MyApplication />);
```

Use this for any render that is not already under the application mount provided by `application.register`.
