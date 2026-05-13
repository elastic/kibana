## Notification Center Example

An example plugin demonstrating the persistent notification events API
(`core.notifications.events`) and a fully featured notification center
built as a sidebar app.

### What it shows

- **Publishing typed events** through the three demo types
  (`notificationExampleReport`, `notificationExampleAlert`,
  `notificationExampleCloud`) registered with `events.registerType()`.
  Demonstrates the `NotificationTypeId` allowlist's example-prefix
  carve-out.
- **Stable per-button event ids** (`notificationExampleReport:demo-1`,
  etc.) so repeated publishes upsert the same entry rather than appending
  duplicates.
- **Read / unread toggling** via the read dot on each event.
- **Pinning**, with pinned events automatically floating to the top of
  every list view (a feature provided by `useNotifications`).
- **Persistence across reload** — read and pinned state is restored when
  the same id is re-published after a hard reload. Backed today by
  `LocalStorageNotificationStateStore`; will be swapped for
  `UserStorageNotificationStateStore` when `core.userStorage` browser
  hooks ship.
- **Global-header-style unread badge** in the controller page header,
  subscribing to `useUnreadNotificationCount` (O(1) per render).
- **Tabbed sidebar UI** with All / Unread / Read views, plus "Mark all as
  read" in the sidebar header.

### Run

Use this command to run the dev server with the Notification Center Example app 
```bash
yarn start \                                                                                                                             ✘ INT
  --plugin-path examples/developer_examples \
  --plugin-path examples/notification_center_example
```

Open **Notification Center Example** from the developer examples list.