# @kbn/core-notifications-browser-internal

Implementation of `core.notifications` — `EventsService`, `ToastsService`,
`FeedbackService`, `ToursService`, and the temporary localStorage-backed
notification state store. **Maintainer-only**; consumers should import
from `@kbn/core-notifications-browser` instead.

For the public surface (types, contract, allowlist, lifecycle), see
[`@kbn/core-notifications-browser`](../browser/README.mdx).

## `EventsService` flow

`EventsService` is the runtime implementation of `INotificationEvents`. It
owns a `BehaviorSubject<NotificationEvent[]>` and a
`BehaviorSubject<number>` for the unread count.

### `start()`

```
NotificationsService.start()
  └─ await events.start()
        └─ await store.preload()     // see "Storage backend" below
        └─ returns INotificationEvents
```

`start()` is async because the state store may need to fetch persisted
data before any `notify()` can hydrate flags. The current localStorage
impl's `preload()` is a no-op (reads are lazy), but the future
`UserStorageNotificationStateStore` will use this to await
page-metadata injection.

### `notify(event)`

```
notify(event)
  1. scope = event.spaceId
  2. readIds   = store.getReadIds(scope)    (sync — see store docs)
     pinnedIds = store.getPinnedIds(scope)
  3. hydrate event.isRead   |= readIds.has(event.id)
     hydrate event.isPinned |= pinnedIds.has(event.id)
  4. upsert in events array by id
  5. compute unread-count delta vs previous entry (if any)
  6. events$.next(newArray)
     unreadCount$.next(prev + delta)
```

Upsert semantics mean a second `notify()` with the same `id` replaces the
first entry. This is what makes persisted state observable after reload —
re-publishing brings the same id back with hydrated flags.

### `markAsRead`, `pin`, `unpin`

All three update the events array in place (immutable copy), adjust
`unreadCount$` if applicable, then write through to the store using
`event.spaceId` for scope. They no-op if the event id is unknown or the
flag is already at the requested value.

### `unreadCount$`

A dedicated `BehaviorSubject<number>` maintained alongside `events$`.
Updates fire only when the count actually changes. This is what
`useUnreadNotificationCount` subscribes to — the global-header badge
must not iterate the full events list on every render, so the count is
derived once at mutation time.

## Storage backend

### `LocalStorageNotificationStateStore` (TEMPORARY)

> **This implementation is a stopgap.** It will be replaced when the
> `core.userStorage` browser-side service ships. The interface
> ([`NotificationStateStore`](../browser/src/notification_state_store_types.ts))
> is shape-aligned with `core.userStorage` so the swap is mechanical:
>
> 1. Add `UserStorageNotificationStateStore` (new file, same interface —
>    adapter delegates each method to `core.userStorage`).
> 2. Change one line in `NotificationsService.start()`:
>    `new LocalStorageNotificationStateStore()` →
>    `new UserStorageNotificationStateStore(core.userStorage)`.
> 3. Delete `LocalStorageNotificationStateStore` and its test file.
>
> No file outside the new store class needs to change. Hooks, components,
> the example plugin, and storybook mocks stay put.
>
> Background: `/Users/tsullivan/Documents/Per-User Storage in Kibana.md`
> (in-review RFC, the future home of per-user browser state in Kibana).

### Storage key layout

The localStorage impl writes JSON arrays under predictable keys:

| Scope | Read state key | Pinned state key |
| :--- | :--- | :--- |
| Global (no spaceId) | `core.notifications.events.readIds` | `core.notifications.events.pinnedIds` |
| Space-scoped | `core.notifications.events.<spaceId>.readIds` | `core.notifications.events.<spaceId>.pinnedIds` |

Each value is `JSON.stringify(Array.from(set))` — a flat string array.

`spaceId` is sanitized with `/^[A-Za-z0-9_-]+$/`. Anything that doesn't
match throws synchronously inside the key builder. This is the only
validation core notifications performs — semantic validation (does the
space actually exist?) is the caller's responsibility.

### Resilience

The store silently swallows three categories of error:

- **Corrupt JSON** in localStorage → falls back to an empty set.
- **Quota exceeded** on write → in-memory mirror still reflects the
  change for this session; next reload starts fresh.
- **Disabled storage** (private browsing, denied permissions) → all
  operations no-op cleanly.

This matches the pattern in
`src/core/packages/chrome/browser-internal/src/state/state_helpers.ts:63-105`.

## Adding a new backend

To swap localStorage for another backend:

1. Implement `NotificationStateStore` in a new file. The async-write /
   sync-read shape means most of your work is keeping an in-memory mirror
   (`BehaviorSubject<Set<string>>`) populated.
2. If the backend needs an async fetch before reads are valid, do it in
   `preload()`. Otherwise leave `preload()` as a no-op.
3. Construct your new store in `NotificationsService`'s constructor in
   place of `LocalStorageNotificationStateStore`.
4. Tests should cover: empty preload, malformed input, per-scope
   isolation, idempotent mutations.

## Tests

```bash
yarn test:jest src/core/packages/notifications/browser-internal
```

Co-located test files:
- `events/events_service.test.ts` — upsert, hydration, unread count, scope, primary action resolution
- `events/local_storage_state_store.test.ts` — preload, mutations, sanitization
- `feedback/feedback_service.test.ts`
- `tours/tours_service.test.ts`
- `notification_coordinator.test.ts`
- `toasts/…`
