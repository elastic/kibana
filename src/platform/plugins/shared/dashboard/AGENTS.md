# Dashboard plugin

## Child panel state is opaque

Dashboard persists each panel's serialized state and hands it back to the panel. The contents are opaque to dashboard code: only the plugin that registers an embeddable type reads or interprets its state. See "Internal state management" in `src/platform/plugins/shared/embeddable/README.md`.

Opaque covers another plugin's type constants (e.g. `ESQL_CONTROL`), field names inside a child's serialized state or an incoming package's `serializedState`, and helpers from other packages that interpret that state (e.g. `getESQLControlVariablesFromState`).

When dashboard code needs to know something about a child panel, get it through:

1. For a mounted child: a published API, checked with an `apiPublishes*` / `apiHas*` guard. Example: `apiPublishesESQLVariable` in `public/dashboard_api/esql_variables_manager.ts`.
2. For a panel that hasn't mounted yet, or an incoming package: the registered embeddable definition, via `embeddableService.getEmbeddableDefinition(type)`. Example: `layoutConstraints` in `public/dashboard_api/layout_manager/layout_manager.ts`.

When neither covers the case, stop and ask the user before adding any other way to reach child state. As the default option, propose the matching addition, implemented by the plugin that registers the type: a new `apiPublishes*` / `apiHas*` interface for a mounted child, or a new member on the embeddable definition for a panel that hasn't mounted.

Existing dashboard code that reads child state (e.g. `public/dashboard_app/url/bwc/`) is not precedent. Leave it as is unless the task is about that code.

Apply this rule when reviewing changes to this plugin, too.
