# Status messages: toasts and `notifications.screenReader.notify`

**Applies to:** core `notifications.toasts`, core `notifications.screenReader`, `EuiLiveAnnouncer`, `EuiScreenReaderLive`

Status messages (WCAG 2.2 SC 4.1.3) must reach screen reader users without moving focus. Kibana announces them through **one shared live region** owned by core. That region:

- holds messages back while a modal, flyout or popover hides the rest of the page from screen readers;
- reads messages that arrive close together (e.g. a toast and a page change) as one announcement;
- waits until the previous announcement is likely read, so they don't interrupt each other.

## Canonical usage

- **Feedback for an action** (saved, deleted, exported, failed) → use **`notifications.toasts`**. Toasts are announced automatically with their type, e.g. "Success: Rule exported". Don't add your own announcement for the same message.
- **Visual change that isn't a toast** (results filtered, form reset, items reordered) → call **`notifications.screenReader.notify(message)`** with a localized message.
- **Errors in a form that stays open** → render them inside the form, e.g. **`EuiCallOut`** with **`announceOnMount`** (see `callouts.md`). A toast fired while a modal or flyout stays open is announced only after it closes.
- Don't add **`EuiLiveAnnouncer`**, **`EuiScreenReaderLive`** or **`aria-live`** regions outside an open modal for announcements: screen readers ignore them while the modal is open, and they compete with the shared region.

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

// WRONG — a separate live region competes with the shared one, and is ignored while a modal is open
<EuiScreenReaderLive>{savedMessage}</EuiScreenReaderLive>

// RIGHT
notifications.toasts.addSuccess(savedMessage);
```
