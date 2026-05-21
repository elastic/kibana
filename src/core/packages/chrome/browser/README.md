# @kbn/core-chrome-browser

Public type definitions for Core's browser-side Chrome service. This is the package plugins import from — `shared` visibility means any Kibana package can depend on it.

## Key exports

| Export | Description |
|---|---|
| `ChromeStart` | Plugin-facing Chrome contract returned by `core.chrome` in `start()` |
| `ChromeSetup` | Plugin-facing Chrome contract returned by `core.chrome` in `setup()` |
| `ChromeBreadcrumb` | Breadcrumb item set via `chrome.setBreadcrumbs()` |
| `ChromeNavLink` | Navigation link registered by plugins |
| `ChromeNavControl` | Arbitrary UI controls rendered in the header |
| `ChromeHelpExtension` | Help-menu extension registered by plugins |
| `ChromeStyle` | `'classic'` or `'project'` layout mode |
| `NavigationTreeDefinition` | Project-style navigation tree definition |
| `SolutionId` | Identifier for a solution navigation |
| `SidebarSetup` / `SidebarStart` | Sidebar service contracts |

See `index.ts` for the full list of exported types.
