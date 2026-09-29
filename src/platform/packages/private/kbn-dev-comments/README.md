# @kbn/dev-comments

In-page comments for reviewing UI during development. A comment is pinned to an element and keeps the page it was made on, the clicks that led there and a screenshot, so a reader can be taken back to what the author saw.

## Usage

```tsx
import { CommentsButton, type CommentsHostServices } from '@kbn/dev-comments';

const services: CommentsHostServices = {
  api,            // where comments are stored
  location,       // the current page
  navigateToPath, // opens the page of a comment being navigated to
  getCurrentUser, // who is commenting
  captureViewport,// optional: screenshots
  formatDate,     // dates in the host's locale: @kbn/i18n-react's
  ignoreSelectors,// optional: host UI to leave alone
};

<CommentsButton services={services} />;
```

`CommentsButton` toggles comment mode and renders the layer (pins, threads and the "Comments" panel). Mount it as the page loads, so that the clicks leading up to a comment are recorded.

## Comment mode

- Click an element to comment on it. Pins mark the page's comments; the panel lists all of them, grouped by page. Resolved comments are left out of the list unless the panel's filter shows them.
- Hold `Alt` (`⌥`) to click through to the page instead: open a flyout, follow a link. The page gets the click without the modifier, and it counts towards the trail like any other.
- Tooltips can be commented on. A tooltip would go as the pointer left its element for it; in comment mode, it stays showing while the pointer heads over to it from the element, straight or not, to be clicked, and while the pointer is on it or on its pin, thread or composer; meanwhile the page is told nothing of the pointer, so neither what is under the tooltip nor the pin's own tooltip takes it down. With the keyboard, an arrow key aims at the tooltip the focused element shows (and back at the element), for `Enter` to comment on it. The pin is on the tooltip whenever it shows, and its thread opens at the pin; a comment saved after its tooltip has gone is shown in the panel. The hover is recorded as the last step of the trail: "Take me there" asks the reader to repeat it, and opens the thread once the tooltip is there.
- Comments are Markdown. They can be replied to and resolved, never deleted.
- A click on a comment in the panel takes the reader to it: its pin when the element is on screen; otherwise the comment's page, highlighting the author's clicks one at a time until the element appears.
- When the element cannot be found, as when the UI has changed since, the comment can be viewed in the panel instead, with its screenshot and replies (also from the comment's menu in the list).

## Keyboard

| Shortcut | Action |
| --- | --- |
| `⌘⇧K` / `Ctrl+Shift+K` | Toggle comment mode |
| `Tab`, `Enter` / `Space` | In comment mode: move through the page, comment on the focused element |
| `Alt` / `⌥` + click | In comment mode: click through to the page |
| `↑` `↓` `←` `→` | In comment mode: aim at the tooltip the focused element shows, and back at the element |
| `Esc` | Discard the draft, stop navigating to a comment, close the thread, leave comment mode |
| `⌘↵` / `Ctrl+Enter` | Submit a comment or reply |

Stories: `src/__stories__/comments.stories.tsx`.
