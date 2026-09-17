# @kbn/ui-annotations

In-page comment layer for reviewing UI during development: comments pinned to DOM elements, with the URL, the author's clicks ("Take me there") and a screenshot from the moment the comment was made. Anyone with the layer mounted can comment, reply and resolve.

The package is host-agnostic: everything it needs (persistence, location, navigation, current user, screenshot capture) is injected through `AnnotationsHostServices`.

## Usage

```tsx
import { AnnotationsButton, type AnnotationsHostServices } from '@kbn/ui-annotations';

const services: AnnotationsHostServices = {
  api,            // AnnotationsApi: list / getSnapshot / create / update / exportAll / importAll
  location,       // getPageKey / getPath (both relative to the host's origin and base path) / subscribe
  navigateToPath, // opens a path within the host, in-app when possible
  getCurrentUser, // { username, fullName? }
  captureViewport,// optional: () -> HTMLCanvasElement of what is on screen (e.g. dom-to-image); no screenshots without it
  ignoreSelectors,// optional: host UI that must never be annotated
};

<AnnotationsButton services={services} />;
```

`AnnotationsButton` renders the button that toggles comment mode and mounts the layer itself (pins, popovers, panel) in portals on `document.body`, so it can be placed anywhere in the host's UI. Hosts that want to keep the package out of their page load can render a stand-in button and mount `AnnotationsButton` with `initialActive` on the first click or `⌘⇧K` / `Ctrl+Shift+K`.

## Comment mode

The button (or `⌘⇧K` / `Ctrl+Shift+K`) switches comment mode on and off. While it is on:

- The page is not interactable: pointer and keyboard input is swallowed so the UI state under review stays as it is, the cursor becomes a comment bubble and a click starts a comment on the element under it. Clicking elsewhere while writing moves the comment there. `Tab` still moves focus through the page, and `Enter` or `Space` starts a comment on the focused element.
- Pins mark the current page's comments, each showing its author's avatar (the same color and initial as in the thread). Resolved threads keep their pin, with a wider, green border.
- The "Comments" panel lists every comment, grouped by the page it was made on, the current page first. It can be minimized to its header (comment count, "⋯" menu with export / import, close); closing it leaves comment mode.
- The layer's own UI, and anything matching `ignoreSelectors`, stays interactable.
- Leaving comment mode returns focus to where it was before.

Comments are resolved, never deleted, so nobody can remove someone else's feedback.

## What a comment records

- **Anchor**: an ordered list of locators for the element (`data-test-subj` chain, hand-written `id`, `aria-label`, tag + short text, structural CSS path + content fingerprint); the first one matching exactly one visible element wins, and a locator matching several elements is a miss rather than a guess. The pin follows the innermost element that was under the pointer (a child path relative to the anchored element), so it stays on the same spot when the layout reflows with the window size.
- **Route**: the host's `pageKey` for the page (the pin is only placed there) and the `path` at the moment of commenting, both relative to the host's origin and base path so that exports stay valid across deployments.
- **Trail**: the clicks that revealed UI on the page before commenting (anchor + label each), recorded passively while comment mode is off. A click is kept only when the page shows that it disclosed something: afterwards the control is expanded or selected, or a dialog, menu, listbox or tab panel appeared that was not there before (right away, or within half a second for UI loaded on first use). Form and selection controls, form submits, and clicks that changed data without revealing anything are left out, so a reader is never asked to repeat them.
- **Screenshot**: a JPEG of the whole viewport as the author saw it, captured through `captureViewport` and composited on the page's own background color. It is shown as a thumbnail in the thread; clicking it opens it full screen.

## Take me there

Comments whose element is not on screen (their flyout is closed, the UI changed, they were made on another page) are still listed in the panel, with a "take me there" icon. "Take me there" opens the path the comment was made at, makes the page interactable again and highlights the author's clicks one at a time, most recent first, until the element appears and the comment opens with its pin focused. Only clicks a reader can repeat right now are asked for (the element has to be a disclosure control that is visible, enabled and not covered by other page UI), focus moves to each control so `Enter` repeats the click, and the page gets a few seconds to render before the guide reports that the element cannot be found. Paths that would leave the host's origin once resolved (`//host/…`, a scheme, tabs or newlines that the URL parser strips) are never opened.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `⌘⇧K` / `Ctrl+Shift+K` | Toggle comment mode |
| `Tab`, `Enter` / `Space` | In comment mode: move through the page, start a comment on the focused element |
| `Esc` | Close the panel menu; else discard the comment being written (unless it is being saved), stop "Take me there", close the open thread, then leave comment mode |
| `⌘↵` / `Ctrl+Enter` | Submit a comment or reply |

## Notes for hosts

- `AnnotationsApi.list()` returns every comment, without screenshot images; `getSnapshot(id)` fetches an image on demand.
- `AnnotationsApi.update(id, patch)` should apply the patch atomically on the host's side: two readers replying at once must both get their reply in. Errors thrown by the API are shown to the user with their `message`, so hosts can explain limits (comment count, replies per comment) there.
- "Export all" downloads every comment as JSON (`AnnotationsExport`, `version: 2`, without screenshots); an import adds or overwrites comments by id and reports what it could not read (`skipped`) or write (`failed`). Hosts that stored `version: 1` exports (`route: { pathname, url }`) are expected to rewrite them on import.
- `location.getPageKey()` identifies a page without anything that varies between visits (for example the pathname plus the hash route, without query state); `location.getPath()` is what `navigateToPath` gets back for "Take me there". `isSafeRelativePath` is exported for hosts that want to check paths themselves.
- All UI the package renders carries `IGNORE_ATTR` (`data-devtool-ignore`), the attribute in-page developer tools use to leave each other alone. Hosts can mark their own UI with it or list it in `ignoreSelectors`.
- `captureViewport` should render the viewport at its size in CSS pixels and leave out everything marked with `IGNORE_ATTR`, so the layer's own pins and popovers do not end up in the screenshot. `getEffectiveBackgroundColor(element)` is exported for such implementations: it returns the first non-transparent background color up the tree, so screenshots keep the page's color mode.
- The author's display name ("Post as") is remembered in `localStorage` when it is available.
- The bounds the layer respects when producing comments (`COMMENT_MAX_LENGTH`, `NAME_MAX_LENGTH`, `SELECTOR_MAX_LENGTH`, `TRAIL_MAX_STEPS`, `SNAPSHOT_MAX_BYTES`, `SNAPSHOT_MAX_DIMENSION` in `src/constants.ts`) are what hosts can validate against.

Stories: `src/__stories__/annotations.stories.tsx`.
