# @kbn/core-notifications-browser-components

Presentational React components for rendering notification center events.

This package only owns rendering. For state, types, and the persistence
contract, see [`@kbn/core-notifications-browser`](../browser/README.mdx).
For the hooks that feed these components, see
[`@kbn/core-notifications-browser-hooks`](../browser-hooks/README.mdx).

## Exports

### `NotificationEvent`

Renders a single notification entry: meta row (badge, icon, time, optional
context menu), title, messages, optional primary action, plus left-column
controls for read state and pinning.

```tsx
import { NotificationEvent } from '@kbn/core-notifications-browser-components';

<NotificationEvent
  id={event.id}
  type={event.eventName}
  severity={event.severity}
  badgeColor={event.badgeColor}
  iconType={event.iconType}
  iconAriaLabel={event.eventName}
  time={formatTime(event.timestamp)}
  title={event.title}
  messages={[event.message]}
  isRead={event.isRead}
  onRead={(id, isRead) => events.markAsRead(id, !isRead)}
  isPinned={event.isPinned ?? false}
  onPin={(id, isPinned) => (isPinned ? events.unpin(id) : events.pin(id))}
/>
```

#### Props reference

| Prop | Type | Notes |
| :--- | :--- | :--- |
| `id` | `string` | Required. Drives `data-test-subj` attributes. |
| `title` | `string` | Required. |
| `messages` | `string[]` | Required. Multiple messages render in an accordion. |
| `type` | `string` | Badge label (e.g. `'Report'`). |
| `severity` | `string` | Appended to the badge as `"{type}: {severity}"`. |
| `badgeColor` | `EuiBadgeProps['color']` | Defaults to `'hollow'`. |
| `iconType` | `IconType` | Optional decorative icon next to the badge. |
| `iconAriaLabel` | `string` | If set, the icon gets an `aria-label`; otherwise it's `aria-hidden`. |
| `time` | `ReactNode` | Right-aligned timestamp. |
| `headingLevel` | `'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | Defaults to `'h2'`. |
| `isRead` | `boolean \| undefined` | Renders the read-state dot only when defined. |
| `onRead` | `(id, isRead) => void` | If provided, the read-state dot becomes an interactive toggle. |
| `isPinned` | `boolean` | Renders the pin button only when defined. |
| `onPin` | `(id, isPinned) => void` | Required to render the pin button. |
| `onOpenContextMenu` | `(id) => Array<EuiContextMenuItem element>` | Reserved for the upcoming 3-dot menu UX. |
| `primaryAction` | `string` | Label for the bottom-row action button. |
| `primaryActionProps` | `EuiButtonEmptyProps` | Extra props for the action button. |
| `onClickPrimaryAction` | `(id) => void` | Required to render the primary action button. |
| `onClickTitle` | `(id) => void` | If set, the title renders inside an `EuiLink`. |

### Filter components

Three small, props-controlled filter components that can be composed inside
any notification surface (sidebar, popover, header drop-down). State is owned
by the caller; each component is pure presentation.

#### `NotificationTypeFilter`

Chip row of typeId filters with a "Clear all" link. Empty selection means
"no filter applied — show every type".

```tsx
import { NotificationTypeFilter } from '@kbn/core-notifications-browser-components';

<NotificationTypeFilter
  typeIds={['notificationExampleReport', 'notificationExampleAlert']}
  selectedTypeIds={selected}
  labels={{ notificationExampleReport: 'Report', notificationExampleAlert: 'Alert' }}
  onChange={setSelected}
/>
```

| Prop | Type | Notes |
| :--- | :--- | :--- |
| `typeIds` | `readonly string[]` | Required. Type ids present in the stream; rendered in order. |
| `selectedTypeIds` | `ReadonlySet<string>` | Required. Empty = no filter. |
| `labels` | `Record<string, string>` | Optional. Missing entries render the typeId itself. |
| `onChange` | `(next: ReadonlySet<string>) => void` | Required. Called on each chip toggle and on Clear all. |

#### `NotificationReadStateFilter`

Single-select filter group for read state. Replaces the older All/Unread/Read
tabs above the event list.

```tsx
import {
  NotificationReadStateFilter,
  type NotificationReadState,
} from '@kbn/core-notifications-browser-components';

<NotificationReadStateFilter value={readFilter} onChange={setReadFilter} />
```

| Prop | Type | Notes |
| :--- | :--- | :--- |
| `value` | `'all' \| 'unread' \| 'read'` | Required. Currently selected option. |
| `onChange` | `(next) => void` | Required. |

#### `NotificationSpacesFilter`

Subdued panel with a "Current only" switch. The component does **not** depend
on the spaces plugin — the parent decides whether to render it (typically
only when `spaces` is available at runtime).

```tsx
import { NotificationSpacesFilter } from '@kbn/core-notifications-browser-components';

<NotificationSpacesFilter currentOnly={spacesCurrentOnly} onChange={setSpacesCurrentOnly} />
```

| Prop | Type | Notes |
| :--- | :--- | :--- |
| `currentOnly` | `boolean` | Required. Whether the toggle is on. |
| `onChange` | `(next: boolean) => void` | Required. |

## Storybook

```bash
yarn storybook shared_ux
```

Browse to **Notifications →**:

- **Event** — base, `Pinned`, `PinnedAndRead`.
- **TypeFilter** — `Empty`, `OneSelected`, `AllSelected`, `NoLabelsKnown`.
- **ReadStateFilter** — `All`, `Unread`, `Read`.
- **SpacesFilter** — `Off`, `On`.

## Internationalization

All strings use `i18n.translate` from `@kbn/i18n`:

- Event UI: `core.notifications.event*` (`eventMeta.*`, `eventMessages.*`,
  `eventReadButton.*`, `eventReadIcon.*`, `eventPinButton.*`).
- Filter UI: `core.notifications.filters.*` (`filters.types.*`,
  `filters.readState.*`, `filters.spaces.*`).
