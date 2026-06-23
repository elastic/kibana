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

## Title size

The title is `xs` for a single-row header and `s` when the header has a second row (tabs or a
metadata row), where an `xs` title looks too small in the taller header. This is automatic — there
is no size knob to set.

## Padding

`padding` controls the header's **outer** spacing. The scalar values only add symmetric horizontal
padding; the `bleed` variant additionally breaks the header out of a surrounding padded container.
The header's **internal vertical padding** is standardized regardless of this prop (and of the title
size), so the header keeps a consistent height — 48px for a single row, whether or not only a back
button is present.

- `'none'` — no horizontal padding, no bleed.
- `'s'` — symmetric horizontal padding (compact).
- `'m'` — symmetric horizontal padding (default for inline headers).
- `{ bleed: 'm' | 'l' }` — for a header rendered inline inside a padded section (e.g. an
  `EuiPageSection`). Set `bleed` to the section's **symmetric** padding: the header breaks out to that
  section's top/left/right edges via negative margin so it spans full width and sits flush at the top,
  and its content is auto re-inset by the same amount to stay aligned with the page gutter. (The
  single value applies to both the sides and the top because the section's padding is symmetric.)

## Testing

`AppHeader` reads chrome from context, so rendering it in a test without a `ChromeServiceProvider`
throws `"useChromeService must be used within a ChromeServiceProvider"`. There are two ways to
satisfy it.

**Option 1 — wrap your test harness with a chrome provider.** Prefer this when a suite already has a
shared render harness: add the provider once and every test renders the real header.

```tsx
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core/public/mocks';

<ChromeServiceProvider value={{ chrome: chromeServiceMock.createStartContract() }}>
  {/* ...rest of your harness... */}
</ChromeServiceProvider>;
```

**Option 2 — mock the package.** Prefer this for a one-off test, or when you can't reach a shared
harness:

```ts
jest.mock('@kbn/app-header', () => require('@kbn/app-header/mocks').mockAppHeaderModule());
```

`mockAppHeaderModule()` swaps `AppHeader`/`AppHeaderView` for variants that render the **real**
components wrapped in a mock chrome provider, so the genuine DOM and test subjects are produced. Every
other export (types, registration helpers) is preserved.

Assert against `APP_HEADER_TEST_SUBJECTS` (exported from the package root) for the header's
structural slots and the static menu items it injects (documentation, feedback, add integrations),
so component and test stay in lockstep. Tab and badge subjects, and items passed via `menu`, are
caller-provided and not included.

```ts
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My app');
```

The header injects its `docLink`/feedback/integrations into the app menu, which collapses them into
an overflow popover. `@kbn/app-header/test_helpers` ships RTL helpers to drive it without re-deriving
the EuiPopover quirks:

```ts
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

await openAppMenuOverflow();
expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
```

`MockAppHeader`/`MockAppHeaderView` are also exported directly for tests that render the header
without mocking the module.

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
