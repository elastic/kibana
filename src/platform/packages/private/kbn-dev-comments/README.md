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
  ignoreSelectors,// optional: host UI to leave alone
  RelativeTime,   // optional: how timestamps are shown, e.g. FormattedRelative
};

<CommentsButton services={services} />;
```

`CommentsButton` toggles comment mode and renders the layer (pins, threads and the "Comments" panel). Mount it as the page loads, so that the clicks leading up to a comment are recorded.

## Comment mode

- Click an element to comment on it. Pins mark the page's comments; the panel lists all of them, grouped by page. Resolved comments are left out of the list unless the panel's filter shows them.
- Hold `Alt` (`⌥`) to click through to the page instead: open a flyout, follow a link. The page gets the click without the modifier, and it counts towards the trail like any other.
- Comments are Markdown. They can be replied to and resolved, never deleted.
- A click on a comment in the panel takes the reader to it: its pin when the element is on screen; otherwise the comment's page, highlighting the author's clicks one at a time until the element appears.
- When the element cannot be found, as when the UI has changed since, the comment can be viewed in the panel instead, with its screenshot and replies (also from the comment's menu in the list).

## Keyboard

| Shortcut | Action |
| --- | --- |
| `⌘⇧K` / `Ctrl+Shift+K` | Toggle comment mode |
| `Tab`, `Enter` / `Space` | In comment mode: move through the page, comment on the focused element |
| `Alt` / `⌥` + click | In comment mode: click through to the page |
| `Esc` | Discard the draft, stop navigating to a comment, close the thread, leave comment mode |
| `⌘↵` / `Ctrl+Enter` | Submit a comment or reply |

Stories: `src/__stories__/comments.stories.tsx`.
