# Status messages: toasts and `notifications.screenReader.notify`

**Applies to:** core `notifications.toasts`, core `notifications.screenReader`, `EuiLiveAnnouncer`, `EuiScreenReaderLive`

Status messages (WCAG 2.2 SC 4.1.3) must reach screen reader users without moving focus. Kibana announces them through **one shared live region** owned by core. That region:

- reads messages that arrive close together (e.g. a toast and a page change) as one announcement;
- waits until the previous announcement is likely read, so they don't interrupt each other.

## Canonical usage

- **Feedback for an action** (saved, deleted, exported, failed) → use **`notifications.toasts`**. Toasts are announced automatically with their type, e.g. "Success: Rule exported". Don't add your own announcement for the same message.
- **Visual change that isn't a toast** (results filtered, form reset, items reordered) → call **`notifications.screenReader.notify(message)`** with a localized message.
- **Errors in a modal or flyout that stays open** → render them inside it, e.g. **`EuiCallOut`** with **`announceOnMount`** (see `callouts.md`). VoiceOver ignores live regions outside an open modal ([w3c/aria#1854](https://github.com/w3c/aria/issues/1854)), so it doesn't read toasts or `notify` messages while the modal stays open.
- Don't add your own **`EuiLiveAnnouncer`**, **`EuiScreenReaderLive`** or **`aria-live`** regions outside a modal for announcements: they compete with the shared region.

## Examples

**Non-toast status change**

```tsx
const { notifications } = useKibana().services;

useEffect(() => {
  notifications.screenReader.notify(
    i18n.translate('myPlugin.results.filteredAnnouncement', {
      defaultMessage: '{count, plural, one {# result} other {# results}} found',
      values: { count },
    })
  );
}, [count, notifications]);
```

## Common mistakes

```tsx
// WRONG — duplicates the toast's own announcement
notifications.toasts.addSuccess(savedMessage);
notifications.screenReader.notify(savedMessage);

// WRONG — a separate live region competes with the shared one
<EuiScreenReaderLive>{savedMessage}</EuiScreenReaderLive>

// RIGHT
notifications.toasts.addSuccess(savedMessage);
```
