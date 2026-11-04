# Status messages: toasts and `notifications.screenReader.notify`

**Applies to:** core `notifications.toasts`, core `notifications.screenReader`, `EuiLiveAnnouncer`, `EuiScreenReaderLive`

Status messages (WCAG 2.2 SC 4.1.3) must reach screen reader users without moving focus. Kibana announces them through **one shared announcer** owned by core, with a polite and an assertive live region. It:

- reads messages that arrive close together (e.g. a toast and a page change) as one announcement;
- waits until the previous announcement is likely read, so they don't interrupt each other;
- announces **toasts assertively**, so they're heard even when the same action moves focus (e.g. a closed flyout returning focus to its trigger);
- announces **page titles and `notify()` messages politely** by default, after whatever the screen reader is reading.

Don't announce on every keystroke, e.g. wait until the user stops typing.

## Canonical usage

- **Feedback for an action** (saved, deleted, exported, failed) → use **`notifications.toasts`**. Toasts are announced automatically with their type, e.g. "Success: Rule exported". Don't add your own announcement for the same message.
- **Visual change that isn't a toast** (results filtered, form reset, items reordered) → call **`notifications.screenReader.notify(message)`** with a localized message. It's polite by default. Pass **`{ politeness: 'assertive' }`** only for urgent messages that must interrupt, e.g. errors. Pass a **`key`** when a newer message makes an older one obsolete, e.g. result counts, so only the latest is read.
- **Feedback while a modal or flyout stays open** (e.g. a save error) → show it inside the dialog in an **`EuiCallOut`** with **`announceOnMount`**, not in a global toast. See *Feedback inside an open dialog* below.
- Don't add your own **`EuiLiveAnnouncer`**, **`EuiScreenReaderLive`** or **`aria-live`** regions outside a modal for announcements: they compete with the shared region.

## Feedback inside an open dialog

When an action leaves a modal, flyout or popover open, prefer a **callout inside the dialog** over a global toast. This applies to `EuiModal`, `EuiConfirmModal`, overlay `EuiFlyout` and `EuiPopover` with `ownFocus`. The typical case is a failed save that keeps the form open. The reasons:

- **VoiceOver doesn't announce the toast.** These dialogs set `aria-modal="true"`, and VoiceOver (macOS and iOS, any browser) ignores live regions outside an open `aria-modal` element ([w3c/aria#1854](https://github.com/w3c/aria/issues/1854)). The global toast list is outside the dialog, so VoiceOver users hear nothing while the dialog stays open. JAWS, NVDA and Narrator do read it, so the experience differs by screen reader. A callout inside the dialog is read by all of them.
- **Keyboard users can't reach the toast.** The dialog's focus trap keeps focus inside it. Toast buttons, such as "See the full error" on `addError` toasts or the dismiss button, can't be reached until the dialog closes.
- **The message belongs next to the form.** A callout sits next to the form it's about, which also supports WCAG 3.3.1 (Error Identification). It stays visible until the user fixes the problem, while toasts are separate from the form and dismiss themselves after a timeout.

Use the callout **instead of** a toast for that message. If you also keep the toast, JAWS and NVDA read the message twice. When the action succeeds and closes the dialog, a toast is the right choice: by the time it's announced, the dialog is gone.

While submitting, keep focus in the dialog. `EuiButton` with `isLoading` is disabled, and a disabled button loses focus to `<body>`. Set **`hasAriaDisabled`** so the button stays focusable.

## Examples

**Non-toast status change**

```tsx
const { notifications } = useKibana().services;

useEffect(() => {
  notifications.screenReader.notify(
    i18n.translate('myPlugin.results.filteredAnnouncement', {
      defaultMessage: '{count, plural, one {# result} other {# results}} found',
      values: { count },
    }),
    // Filtering again before this is read replaces it, so only the latest count is announced
    { key: 'myPlugin.results' }
  );
}, [count, notifications]);
```

**Save error inside a flyout**

```tsx
const [saveError, setSaveError] = useState<string>();

const { mutate, isLoading } = useMutation(save, {
  onMutate: () => setSaveError(undefined),
  // The flyout stays open: show the error inside it
  onError: (error: Error) => setSaveError(error.message),
  // The flyout closes: a toast is announced once it's gone
  onSuccess: () => {
    notifications.toasts.addSuccess(savedMessage);
    onClose();
  },
});

<EuiFlyout ownFocus onClose={onClose} aria-labelledby={titleId}>
  <EuiFlyoutBody>
    {saveError && (
      <EuiCallOut
        announceOnMount
        color="danger"
        iconType="error"
        title={i18n.translate('myPlugin.flyout.saveErrorTitle', {
          defaultMessage: 'Unable to save',
        })}
      >
        {saveError}
      </EuiCallOut>
    )}
    {/* form */}
  </EuiFlyoutBody>
  <EuiFlyoutFooter>
    <EuiButton fill isLoading={isLoading} hasAriaDisabled onClick={() => mutate(formData)}>
      {saveLabel}
    </EuiButton>
  </EuiFlyoutFooter>
</EuiFlyout>
```

## Common mistakes

```tsx
// WRONG — duplicates the toast's own announcement
notifications.toasts.addSuccess(savedMessage);
notifications.screenReader.notify(savedMessage);

// WRONG — a separate live region competes with the shared one
<EuiScreenReaderLive>{savedMessage}</EuiScreenReaderLive>

// WRONG — a global toast is the only feedback for an error in a flyout that stays open:
// VoiceOver doesn't read it and keyboard users can't reach it
onError: (error) => notifications.toasts.addError(error, { title: saveFailedTitle }),

// RIGHT — show the error inside the flyout
onError: (error) => setSaveError(error.message),

// RIGHT
notifications.toasts.addSuccess(savedMessage);
```
