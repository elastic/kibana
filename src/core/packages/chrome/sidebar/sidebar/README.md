# @kbn/core-chrome-sidebar

Public types, constants, and utilities for the Chrome Sidebar API. Use this package for type imports and store creation; UI and hooks live in `@kbn/core-chrome-sidebar-components`.

## Exports

- `createSidebarStore` - Creates store configuration with schema and actions
- TypeScript types:
  - `SidebarStoreConfig` - Store configuration type (schema + actions)
  - `SetState`, `GetState`, `SidebarContext` - Store helper types
  - `SidebarApp`, `SidebarAppConfig`, `SidebarAppDefinition`, `SidebarSetup`, `SidebarStart` - Service types
  - `SidebarComponentProps`, `SidebarComponentType` - Component types
  - `SidebarAppId`, `SidebarAppStatus`, `SidebarAppUpdate`, `SidebarAppUpdater` - App types
- Constants: `VALID_SIDEBAR_APP_IDS`, `EXAMPLE_APP_ID_PREFIX`
- Validation: `isValidSidebarAppId()`

Note: Runtime types (`LiveStore`, `SidebarStorage`) are internal-only and live in `@kbn/core-chrome-sidebar-internal`.

## Usage

```typescript
import { createSidebarStore, type SidebarComponentProps } from '@kbn/core-chrome-sidebar';
```

For components and hooks, use `@kbn/core-chrome-sidebar-components`. For architecture details, see the root `README.md`.
