# EUI overlays: modals, flyouts, and popovers

**Applies to:** `EuiModal`, `EuiFlyout`, `EuiFlyoutResizable`, `EuiConfirmModal`, `EuiPopover`

Layered UI that traps or shifts focus needs a **programmatic accessible name** that stays aligned with the visible title.

## When to use which

- **`EuiModal`** — blocking confirmation or form; user must dismiss or complete before continuing.
- **`EuiFlyout` / `EuiFlyoutResizable`** — non-blocking detail or settings panel, often paired with a list / page selection.
- **`EuiConfirmModal`** — yes / no or destructive actions; uses the `title` prop API.
- **`EuiPopover`** — contextual menus, filters, or short anchored content; may or may not have a visible title.

## Canonical usage

Prefer **`aria-labelledby`** pointing at the **visible title** so the spoken name matches what sighted users see.

1. Render a real title inside the overlay (`EuiModalTitle`, `EuiFlyoutTitle`, `EuiPopoverTitle`, `EuiTitle`, or a heading).
2. Give that title element a stable **`id`** — use `useGeneratedHtmlId()` (or `htmlIdGenerator()` in class components), see *HTML ids* in **`../shared_principles.md`**.
3. Set **`aria-labelledby`** on the overlay container to that `id`.
4. Reuse one ID variable for both the title and `aria-labelledby` — never orphan references.
5. **`EuiConfirmModal`** exposes the title as a prop — wire its rendered DOM through **`titleProps={{ id }}`** so the id matches `aria-labelledby`.
6. **No suitable visible title** (rare for popovers) → use **`aria-label`** with `i18n.translate` instead.

Suggested variable names: `modalTitleId`, `flyoutTitleId`, `confirmModalTitleId`, `popoverTitleId`.

## Examples

**`EuiModal` / `EuiFlyout` / `EuiFlyoutResizable`** — title gets `id={...TitleId}`, container gets matching `aria-labelledby`:

```tsx
const flyoutTitleId = useGeneratedHtmlId();

<EuiFlyout aria-labelledby={flyoutTitleId}>
  <EuiFlyoutTitle id={flyoutTitleId}>My title</EuiFlyoutTitle>
</EuiFlyout>
```

**`EuiConfirmModal`** — `aria-labelledby` + matching `titleProps.id`:

```tsx
const confirmModalTitleId = useGeneratedHtmlId();

return (
  <EuiConfirmModal
    aria-labelledby={confirmModalTitleId}
    title={i18nTexts.modalTitle}
    titleProps={{ id: confirmModalTitleId }}
  >
    <p>{i18nTexts.modalDescription}</p>
  </EuiConfirmModal>
);
```

**`EuiPopover`** — visible title:

```tsx
const popoverTitleId = useGeneratedHtmlId();

<EuiPopover aria-labelledby={popoverTitleId}>
  <EuiPopoverTitle>
    <h2 id={popoverTitleId}>Title</h2>
  </EuiPopoverTitle>
</EuiPopover>
```

**`EuiPopover`** — no title, fall back to `aria-label`:

```tsx
<EuiPopover
  aria-label={i18n.translate('myFeature.filterPopover', {
    defaultMessage: 'Filter options',
  })}
>
  {popoverContent}
</EuiPopover>
```

## Common mistakes

```tsx
// WRONG — aria-label duplicates the visible title as a hidden string
<EuiModal aria-label="Settings">
  <EuiModalTitle>Settings</EuiModalTitle>
</EuiModal>

// WRONG — aria-labelledby points at nothing (no titleProps.id wiring)
<EuiConfirmModal aria-labelledby={id} title="Delete?" />

// RIGHT
<EuiConfirmModal aria-labelledby={id} title="Delete?" titleProps={{ id }} />
```
