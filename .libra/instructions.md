# Kibana review guidance

- Enforce the module boundaries declared by `kibana.jsonc`: packages expose only their public entry point, platform and solution visibility constraints are respected, plugin dependencies use setup and start contracts, and changes do not introduce circular plugin dependencies.
- In a plugin's `server/index.ts`, allow only type imports and exports from `./plugin`. Keep shared runtime configuration outside `plugin.ts`, and load the implementation with `await import('./plugin')` inside the async plugin initializer so disabled plugins are not parsed or executed.
- Treat current-user scoping, Spaces isolation, tenant boundaries, and Saved Objects security as mandatory authorization boundaries.
- Require every string or array accepted through an HTTP request schema to have an explicit size bound, using `maxLength` or `maxSize` for `@kbn/config-schema` and `.max()` for Zod.
- Reject new `@ts-ignore`, `@ts-expect-error`, and `eslint-disable` directives; require the underlying type or lint problem to be fixed.
- For UI changes, prefer existing `@kbn/ui-*` and local shared components. Use only public props and composition points, style with Emotion and EUI tokens, and flag internal DOM or generated class targeting, `!important`, and unnecessary component duplication.
- Require accessible names and semantics, keyboard operation, and deliberate focus management for interactive UI changes.
- Require user-visible strings to use Kibana's i18n APIs rather than hard-coded text.
