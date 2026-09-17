# @kbn/dev-comments-plugin

Development-only in-page comments for reviewing Kibana UI: comments pinned to elements, with the URL, the author's clicks ("Take me there") and a screenshot, stored in Elasticsearch and shared by everyone using the same deployment. The UI itself is `@kbn/dev-comments`; this plugin is its Kibana host.

## How to use

1. Click the comment button in the developer toolbar, or press `⌘⇧K` / `Ctrl+Shift+K`.
2. Click any element to comment on it; reply to and resolve comments from their pins or the "Comments" panel.
3. "Take me there" opens the page a comment was made on and replays the author's clicks until its element is on screen.

## How it works

- `public/`: registers the button with the `developerToolbar` plugin (an optional dependency). `CommentsLauncher` stands in for the button until comment mode is first switched on, so `@kbn/dev-comments` and the screenshot library (`dom-to-image-more`) load only then. `host_services.ts` implements the layer's host services on top of core: location and navigation relative to the base path, the current user, viewport capture and the internal API client.
- `server/`: only in dev mode, registers `/internal/dev_comments` routes backed by a hidden, cluster-global index (`.kibana-dev-comments`) written as the internal user. Comments are never deleted, only resolved; creates go through an atomic quota (1000 comments), replies through an atomic append (200 per comment); exports leave screenshots out and imports report what could not be read or written.

## Configuration

- Available in development mode only; outside of it `dev_comments.enabled` can only be `false`, and the server code is never loaded.
- Disable in dev with `dev_comments.enabled: false` in `kibana.dev.yml`.
