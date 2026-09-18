# @kbn/dev-comments

In-page comments for reviewing UI during development. A comment is pinned to an element and keeps the page it was made on, the clicks that led there and a screenshot, so a reader can be taken back to what the author saw.

## Usage

```tsx
import { CommentsButton, type CommentsHostServices } from '@kbn/dev-comments';

const services: CommentsHostServices = {
  api,            // where comments are stored
  location,       // the current page
  navigateToPath, // opens a page for "Take me there"
  getCurrentUser, // who is commenting
  captureViewport,// optional: screenshots
  ignoreSelectors,// optional: host UI to leave alone
};

<CommentsButton services={services} />;
```

`CommentsButton` toggles comment mode and renders the layer (pins, threads and the "Comments" panel). Mount it as the page loads, so that the clicks leading up to a comment are recorded.

## Comment mode

- Click an element to comment on it. Pins mark the page's comments; the panel lists all of them, grouped by page.
- Comments can be replied to and resolved, never deleted.
- A comment whose element is not on screen has a "Take me there" button: it opens the comment's page and highlights the author's clicks one at a time until the element appears.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `⌘⇧K` / `Ctrl+Shift+K` | Toggle comment mode |
| `Tab`, `Enter` / `Space` | In comment mode: move through the page, comment on the focused element |
| `Esc` | Discard the draft, stop "Take me there", close the thread, leave comment mode |
| `⌘↵` / `Ctrl+Enter` | Submit a comment or reply |

Stories: `src/__stories__/comments.stories.tsx`.
