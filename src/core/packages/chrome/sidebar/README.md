Chrome sidebar packages provide a shared, persistent side panel that can host plugin-defined apps without disrupting main app navigation.

## Package overview

- `@kbn/core-chrome-sidebar` - Public types, `createSidebarStore` factory, and app id validation.
- `@kbn/core-chrome-sidebar-components` - React components (`SidebarHeader`, `SidebarBody`) and hooks (`useSidebar`, `useSidebarApp`).
- `@kbn/core-chrome-sidebar-context` - Shared React context, bundled via `kbn-ui-shared-deps-src` to avoid multiple instances.
- `@kbn/core-chrome-sidebar-internal` - Registry, persistence, and runtime services (`SidebarService`, `SidebarStateService`).
- `@kbn/core-chrome-sidebar-mocks` - Jest helpers for setup/start contracts.

## Architecture

Store state management uses a config + hydration pattern:

1. **Plugin setup**: `createSidebarStore()` returns a plain config object (schema + actions factory)
2. **Registration**: Config passed to `registerApp()`, stored in registry
3. **First access**: `getApp()` calls `createLiveStore()` in `sidebar-internal` to hydrate the config into a live store
4. **Live store**: Manages BehaviorSubject, localStorage persistence, and bound actions

This enables lazy initialization - stores are only created when first accessed. The separation keeps plugin-facing code simple (pure config) while platform code (`sidebar-internal`) owns all runtime concerns.

## Key behaviors

- Store state and open state are restored from `localStorage` on reload.
- State uses Zod defaults to avoid `undefined` values when schema evolves.
- Apps without a store typically set `restoreOnReload: false` to avoid reopening with empty state.
- Focus management is left to apps to prevent disruptive auto-focus on reload.

## Documentation

- Public usage guide: `src/core/packages/chrome/sidebar/docs/sidebar.mdx`
- Package-specific notes: each package has its own `README.md`
