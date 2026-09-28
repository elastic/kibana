# @kbn/dev-comments-plugin

Development-only in-page comments.

## How to use

1. Click the comment button in the developer toolbar, or press `⌘⇧K` / `Ctrl+Shift+K`.
2. Click any element to comment on it; reply to and resolve comments from their pins or the "Comments" panel.
3. The navigate action of a comment whose element is not on screen opens the page it was made on and replays the author's clicks until the element appears.

## How it works

- `public/`: registers the button with the `developerToolbar` plugin. The layer mounts with the toolbar item rather than on first use, so that the clicks that reveal UI are recorded before comment mode is ever switched on; only the screenshot library (`dom-to-image-more`) loads on first capture. `host_services.ts` implements the layer's host services on top of core: location and navigation relative to the server base path (so a comment stays with the space it was made in), the current user, viewport capture and the internal API client.
- `server/`: only in dev mode, registers `/internal/dev_comments` routes backed by two cluster-global indices managed by `@kbn/storage-adapter` and written as the internal user: `.kibana_dev_comments` holds the comments, `.kibana_dev_comment_snapshots` their screenshots under the comment ids, so that a comment is updated without moving its image. Comments are never deleted, only resolved; the store holds at most 1000 comments with 200 replies each.

## Configuration

- Available in development mode only; outside of it `dev_comments.enabled` can only be `false`.
- Disable in dev with `dev_comments.enabled: false` in `kibana.dev.yml`.
