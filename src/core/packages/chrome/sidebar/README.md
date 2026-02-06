Chrome sidebar packages provide a shared, persistent side panel that can host plugin-defined apps without disrupting main app navigation.

Implementation overview:
- `@kbn/core-chrome-sidebar` exposes public types and app id validation helpers only.
- `@kbn/core-chrome-sidebar-components` provides the React components and hooks that plugins use.
- `@kbn/core-chrome-sidebar-context` owns the shared React context and is bundled via `kbn-ui-shared-deps-src` to avoid multiple instances.
- `@kbn/core-chrome-sidebar-internal` implements the registry, persistence, and runtime state services.
- `@kbn/core-chrome-sidebar-mocks` provides Jest helpers for setup/start contracts.

Key behaviors:
- Sidebar params and open state are restored from `localStorage` on reload.
- Params use Zod defaults to avoid `undefined` state when schema evolves.
- Apps that do not use params typically set `restoreOnReload: false` to avoid reopening with empty state.
- Focus management is left to apps to prevent disruptive auto-focus on reload.

Where to look:
- Public usage guide: `src/core/packages/chrome/sidebar/docs/sidebar.mdx`.
- Package-specific notes: each package has its own `README.md`.
