# EUI overlays: modals, flyouts, and popovers

**Applies to:** `EuiModal`, `EuiFlyout`, `EuiFlyoutResizable`, `EuiConfirmModal`, `EuiPopover`

Use this guide when building or refactoring **layered UI** that traps or shifts focus: dialogs, side panels, and anchored popovers. The overlay container needs a **programmatic accessible name** that stays aligned with the visible title.

## When to use which

- **`EuiModal`** — blocking confirmation or form; user must dismiss or complete before continuing.
- **`EuiFlyout` / `EuiFlyoutResizable`** — non-blocking detail or settings panel, often paired with a list / page selection.
- **`EuiConfirmModal`** — yes / no or destructive actions; uses the `title` prop API.
- **`EuiPopover`** — contextual menus, filters, or short anchored content; may or may not have a visible title.

## Naming contract

Prefer **`aria-labelledby`** pointing at the **visible title** so the spoken name matches what sighted users see.

1. Render a real title inside the overlay (`EuiModalTitle`, `EuiFlyoutTitle`, `EuiPopoverTitle`, `EuiTitle`, or a heading).
2. Give that title element a stable **`id`** — use `useGeneratedHtmlId()` (or `htmlIdGenerator()` in class components), see **`../html_ids.md`**.
3. Set **`aria-labelledby`** on the overlay container to that `id`.
4. Reuse one ID variable for both the title and `aria-labelledby` — never orphan references.

If there is **no** suitable visible title (rare for popovers), use **`aria-label`** with `i18n.translate` instead.

### `EuiModal` / `EuiFlyout` / `EuiFlyoutResizable`

Title element gets **`id={modalTitleId}`** (or `flyoutTitleId`); container gets **`aria-labelledby`** with the same variable.

```tsx
const flyoutTitleId = useGeneratedHtmlId();

<EuiFlyout aria-labelledby={flyoutTitleId}>
  <EuiFlyoutTitle id={flyoutTitleId}>My title</EuiFlyoutTitle>
</EuiFlyout>
```

Suggested variable names: `modalTitleId`, `flyoutTitleId`.

### `EuiConfirmModal`

`EuiConfirmModal` exposes the title as a **prop** — wire its rendered DOM through **`titleProps`** so the id matches **`aria-labelledby`**.

1. **`aria-labelledby={confirmModalTitleId}`**
2. **`titleProps={{ id: confirmModalTitleId }}`** — same variable.

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

Class component: `const confirmModalTitleId = htmlIdGenerator()('confirmModalTitle');` inside `render()`.

### `EuiPopover`

```tsx
const popoverTitleId = useGeneratedHtmlId();

return (
  <EuiPopover aria-labelledby={popoverTitleId}>
    <EuiPopoverTitle>
      <h2 id={popoverTitleId}>Title</h2>
    </EuiPopoverTitle>
  </EuiPopover>
);
```

**No title element** — use **`aria-label`** with `i18n.translate`:

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

// RIGHT — point at the visible title
const modalTitleId = useGeneratedHtmlId();
<EuiModal aria-labelledby={modalTitleId}>
  <EuiModalTitle id={modalTitleId}>Settings</EuiModalTitle>
</EuiModal>

// WRONG — aria-labelledby points at nothing
<EuiConfirmModal aria-labelledby={id} title="Delete?" />

// RIGHT — titleProps wires the id to the rendered title
<EuiConfirmModal aria-labelledby={id} title="Delete?" titleProps={{ id }} />
```
