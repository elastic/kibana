# @kbn/app-header

React APIs for Kibana app headers during the Chrome Next migration.

Chrome Next uses one shared header view with two placement models:

- App-owned inline rendering, where the page renders `AppHeader` in its own React tree.
- Chrome-owned rendering, where the app registers `AppHeaderConfig` and Chrome renders the layout
  top-bar slot.

Prefer inline rendering for new migrations. Use Chrome-owned registration as a transitional path when
the page cannot safely own the header placement yet.

## Folder layout

Region components (back button, badges, tabs, metadata, app menu, title actions, etc.) live as flat
files directly in `src/app_header/`, with shared data resolution in `src/app_header/hooks/`. A region
graduates to its own folder only when it gains real complexity of its own — an internal component
split, dedicated stories, or a README. Today only `title_area/` meets that bar. Keep new regions flat
until they earn a folder; don't pre-folder simple slots.

## Which API should I use?

Use `AppHeader` when the page can render its header inline. This is the preferred model for pages
that own their title, back target, tabs, badges, and app menu locally.

Use `ChromeAppHeaderRegistration` when Chrome should own the top-bar slot. This keeps migration
small for pages with sticky or shared top-nav constraints while still using the shared header view.

Use `useChromeAppHeaderRegistration` only for lower-level wrappers that need to compose registration
with other hooks. Most apps should use `ChromeAppHeaderRegistration`.

Use `chrome.next.appHeader.set` only when a React adapter is not practical. It is the imperative
primitive behind the React APIs.

## Editable titles

Pass a title object when the page title can be renamed from the header:

```tsx
<AppHeader
  title={{
    text: name,
    onSave: async (nextName) => {
      const saved = await saveName(nextName);
      if (!saved) {
        return 'Choose a different name.';
      }
    },
  }}
/>
```

The header renders a normal heading until the user edits it. Pressing Enter or leaving the input
saves, Escape cancels, and returning a string from `onSave` keeps edit mode open.

## Chrome Next flag and runtime checks

Chrome layout code should use `isNextChrome(featureFlags)` from `@kbn/core-chrome-feature-flags` to
decide which layout slots are active.

App-facing React code usually should not read the flag directly. `ChromeAppHeaderRegistration`
registers only when Chrome Next is enabled and the active chrome style is project:

```ts
chrome.next.isEnabled && chrome.getChromeStyle() === 'project';
```

When this condition is false, registration is a no-op and the existing classic/project Chrome paths
continue to own the header area.

## Migration guidance

Migrate route-by-route, not necessarily app-by-app. Different routes in the same plugin can use
different buckets while the migration is in progress:

| Bucket | Preferred API | When to use |
|---|---|---|
| Inline-ready | `AppHeader` | The page can colocate header state with its React tree. |
| Chrome-owned transitional | `ChromeAppHeaderRegistration` | Chrome should own the top-bar slot while the route keeps existing layout constraints. |
| Fallback-only | Legacy Chrome state | Temporary safety net for routes that have not explicitly migrated. |

### Fallback-only

Chrome Next in project layout does not render the classic breadcrumbs UI. For unmigrated routes,
Chrome can still render a minimal app header as a fallback by deriving:

- A back button from the closest usable breadcrumb.
- A menu from `chrome.setAppMenu()` or a legacy `chrome.setHeaderActionMenu()` mount point.
- Badges from legacy badge state.

This is a compatibility fallback, not a migration target. If breadcrumbs are missing, stale, or point
to the wrong parent, the fallback back button inherits the same problem. Move routes in this bucket
to explicit `AppHeader` or `ChromeAppHeaderRegistration` configuration.
