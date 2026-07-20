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

## Spacing

`spacing` controls the header's content inset and whether its background and bottom border break out
of a padded parent. It does not affect sticky positioning. Vertical padding matches the horizontal
inset so content sits the same distance from every edge. `'flush'` is the exception: the parent owns
the horizontal inset, but the header still applies the standard vertical padding to its own content.

The preferred layout keeps `AppHeader` outside the padded content section. In that structure, omit
`spacing` and let the header own its standard 16px inset. If the page shell owns the inset for the
header as well as the body, use `'flush'`.

The bleed modes are compatibility options for layouts where the page shell forces the header inside
a padded content container. They couple the header to its parent's padding through negative margins,
so they should be treated as a transitional layout pattern rather than the target structure.

Choose the value from the padding of the header's immediate parent:

- Use `'standard'` (or omit `spacing`) when the parent does not add padding around the header. The
  header supplies the standard 16px horizontal page gutter.
- Use `'compact'` for dense layouts that intentionally use an 8px symmetric gutter. Discover uses this
  mode. A titleless header (only a back and/or overflow button) already defaults to `'compact'` so
  sparse legacy states don't look too tall.
- Use `'flush'` when the parent or adjacent layout already owns the content inset. The header adds no
  padding or negative margins, so its background stays within the parent's content box.
- Use `'bleed'` when the header is a direct child of a container with 16px symmetric padding
  (`paddingSize="m"`) and its background and border need to reach that container's top, left, and
  right edges. The header applies 16px negative top and inline margins, then adds 16px inline padding
  so its content stays on the parent's content grid.
- Use `'largeBleed'` for the same arrangement in an existing container with 24px symmetric padding
  (`paddingSize="l"`). This mode preserves legacy layouts; new layouts should use a 16px parent
  gutter and `'bleed'`.

A bleed value must match the parent's actual top and inline padding. Do not use a bleed mode in an
unpadded parent, and do not use `'bleed'` inside a 24px parent. Bleed does not cancel bottom padding.

For `EuiPageTemplate.Section` and `KibanaPageTemplate.Section`:

- `paddingSize="none"`: omit `spacing` so `AppHeader` supplies its 16px inset. Use `'flush'` only when
  another wrapper already supplies the intended inset.
- `paddingSize="m"`: use `'bleed'` if the header must remain inside the section.
- `paddingSize="l"`: use `'largeBleed'` if the header must remain inside the section. An
  `EuiPageTemplate.Section` with no `paddingSize` also uses the 24px default.
- Other padding sizes have no matching bleed mode. Move the header outside the padded section so it
  can own its standard gutter.

The same mapping applies when the effective padding comes from page template `mainProps` instead of
an explicit section.

The header's height is driven by its content plus the symmetric vertical padding, with a minimum floor
so short headers (e.g. a title with no trailing control) don't get too thin. The floor is 64px in the
standard modes and 48px in `'compact'`.

## Sticky positioning

`sticky` defaults to `true` and should normally be omitted. Use `sticky={false}` only when the
full-page layout has its own mechanism that keeps the app header sticky within the correct scrolling
container. Rendering an inline or full-width header is not by itself a reason to disable sticky
positioning.

## Testing

`AppHeader` reads chrome from context, so rendering it without a `ChromeServiceProvider` throws
`"useChromeService must be used within a ChromeServiceProvider"`.

**If your harness renders through `KibanaRenderContextProvider {...coreStart}`, you need nothing.** That
provider forwards `chrome.withProvider`, and the chrome mock (`chromeServiceMock.createStartContract()`)
implements it just like production — wrapping children in `ChromeServiceProvider`. So any test using the
standard core-mock render harness already has chrome context, exactly as the app does at runtime.

**For components rendered in isolation** (a bare `render(<Component />)` with no core-mock render
context), wrap with `MockAppHeaderProvider`, which supplies everything an `AppHeader` needs in tests
(today just the chrome context):

```tsx
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';

render(
  <MockAppHeaderProvider>
    <MyComponentThatRendersAnAppHeader />
  </MockAppHeaderProvider>
);
```

Pass `chrome` to override the default mock chrome service when a test needs custom chrome behavior:

```tsx
<MockAppHeaderProvider chrome={myChromeMock}>{children}</MockAppHeaderProvider>
```

`MockChromeContextProvider` (the generic chrome-only provider it wraps) is also re-exported here, and
lives in `@kbn/core-chrome-browser-context-mocks` for non-header code.

Assert against `APP_HEADER_TEST_SUBJECTS` (from the package root) so component and test can't drift:

```ts
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';

expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('My app');
```

`APP_HEADER_TEST_SUBJECTS.title` is placed on the visible title text element (not the wrapper), so
exact text matchers such as Playwright `toHaveText` or jest exact text resolve to just the rendered
title and are not polluted by the hidden width sizer. In edit mode the visible title is replaced by
the input, exposed as `APP_HEADER_TEST_SUBJECTS.titleInput`.

Menu items — including the header's own documentation/feedback/integrations — collapse into the app
menu overflow popover at narrow widths (the default in jsdom). Open it with the helper from
`@kbn/app-header/test_helpers` before querying those items:

```ts
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

await openAppMenuOverflow();
expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
```

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
