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
- **Filter panel sidebar UI** — type chips (All / Report / Alert / Cloud),
  state filter (All / Unread / Pinned), and an optional "Current space only"
  toggle (visible when the spaces plugin is available). All filters compose;
  "Mark all as read" lives in the sidebar header.
- **Registration-time primary actions** — the report type registers a
  `resolvePrimaryAction` resolver at `registerType` time. The sidebar calls
  `events.getPrimaryActionForEvent` per row and wires the returned label and
  handler without any type-specific branching.

### Run

Use this command to run the dev server with the Notification Center Example app 
```bash
yarn start \                                                                                                                             ✘ INT
  --plugin-path examples/developer_examples \
  --plugin-path examples/notification_center_example
```

Open **Notification Center Example** from the developer examples list.