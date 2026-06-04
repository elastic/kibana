# Title area

The leading region of the app header: an optional back button followed by the page
title. The title is either a plain string (read-only) or an editable title that the
user can rename inline.

- `title_area.tsx` — `TitleArea`: thin layout orchestrator (back button + title in a
  flex row). Holds no edit state.
- `title.tsx` — `Title`: the editable/read-only title itself. All the styling, width
  model, save flow, and a11y live here. Also exports the `isEditableTitle` type guard.
- `title_area.stories.tsx` — every scenario, rendered inside the full app header.
- `index.ts` — public barrel (`TitleArea`, `TitleAreaProps`).

This README is the orientation doc for anyone (human or agent) changing this code. It
records the non-obvious constraints and the decisions behind them so you don't
re-break them. Read it before touching the CSS or the save flow.

## Public shape

```ts
type AppHeaderTitle = string | AppHeaderEditableTitle;

interface AppHeaderEditableTitle {
  text: string;
  onSave: (next: string) => string | void | Promise<string | void>;
  ariaLabel?: string;
  placeholder?: string;
}
```

A `string` title renders as a non-editable heading. An object title renders the
inline editor. `onSave` returns nothing on success, or an **error string** to reject
the value (also thrown errors are caught and surfaced). The component owns all edit
state (`draft`, `error`, `isSaving`); the caller only owns the committed `text`.

## The one hard requirement: read and edit must be pixel-identical

The whole design exists to make the resting heading and the edit input occupy the
**exact same box**, so clicking the title does not shift anything by a single pixel.
Everything below follows from that.

### Width comes from a hidden sizer, never from JS measurement

Both modes use a single CSS grid cell (`grid-template-columns: minmax(0, max-content)`)
sized by a hidden `<span>` (`titleSizer`, `white-space: pre`, `visibility: hidden`).
The visible text truncates inside that track; the input scrolls inside it. There is
**no `getBoundingClientRect`, no `ResizeObserver`, no width state** — earlier versions
had them and caused stutter/jitter on click and while typing. If you need the box to
grow as the user types, feed the typed value into the sizer; do not measure.

- Read mode sizes to the visible text (or `placeholder` when empty).
- Edit mode sizes to `draft` (or `placeholder` while the draft is empty).
- The `<input>` has `size={1}` so its intrinsic width can't inflate the track.

### The hover/edit affordance bleeds via pseudo-elements, not layout

The grey background and the border are drawn by `::before` (background, `z-index: -1`)
and `::after` (border, on top) on `titleFrame`. They are absolutely positioned and
**bleed outward** (negative `inset`) past the text on every side. They never enter
layout, so:

- A resting title keeps the exact position and trailing spacing of a plain heading —
  no extra gap before the badges. (Do not add margins/padding to create the hover box;
  that reintroduces the gap and the layout shift.)
- `::after` paints above the status-icon scrim so the invalid red border is never
  hidden by the gradient.

The non-editable title reuses the same `titleFrame`; its overlay simply never
activates, so editable and non-editable headings line up identically.

## Edge cases that are deliberately handled

- **Edit mode has a minimum width.** `editingTitleFrame` floors the grid track to
  `~128px` (`minmax(calc(size.base * 8), max-content)`) so a short or empty title still
  gives a comfortable click/typing target instead of collapsing to content width (or to
  nothing, leaving only the status icon when empty). Long titles exceed the floor and
  size to content. Trade-off: a short title widens slightly on entering edit mode; this
  is the deliberate simple version (previously the floor was applied only while the draft
  was empty to avoid that jump, at the cost of extra conditional logic).
- **Trailing blur after Enter/Escape.** Resolving via keyboard unmounts the focused
  input, which fires a blur that would otherwise re-enter `save()`. `resolvingRef`
  guards against that double-commit; a genuine click-away still saves.
- **No-op save.** If the trimmed draft equals the trimmed current text, we close the
  editor **without** calling `onSave` (covers leaving an empty title empty).
- **Empty -> error, not save.** A blank non-equal draft sets the empty-title error
  instead of calling `onSave`.
- **Status icon never changes layout.** The saving spinner / error icon is absolutely
  positioned with a gradient scrim, so showing it does not change the box width or
  height. The scrim is click-through (only the icon is interactive) so the tooltip
  works and the input stays clickable underneath.
- **Long title truncation.** Read mode truncates with an ellipsis; edit mode scrolls
  within the same max-width. Both cap at `max-inline-size: 100%`.

## Interaction & save semantics

- Click, `Enter`, or `F2` on the read trigger enters edit mode.
- `Enter` or blur **saves**; `Escape` **cancels** (restores `text`).
- On entry the whole title is selected (`input.select()` in a `requestAnimationFrame`)
  so the caret never lands in a surprising spot. Re-clicking positions it normally.
- `save`/`cancel` return focus to the read trigger via `returnFocusToTitle` so keyboard
  users aren't dropped at the top of the page.

## Accessibility decisions

- The `<h1>` accessible name comes from the **visible title text** (the sizer span is
  `aria-hidden`), so screen readers announce the page title, not edit chrome.
- Editability is conveyed separately: a visually-hidden instructions span
  (`editInstructions`) referenced by `aria-describedby` on the read trigger, kept
  **outside** the `<h1>` so it doesn't pollute name-from-content.
- The input gets `aria-label` (caller's `ariaLabel`, which should name the edited
  entity e.g. "Edit dashboard name", or a generic default), `aria-invalid`, `aria-busy`
  while saving, and `aria-describedby` -> the error.
- The error is announced via a visually-hidden `role="alert"` span; the visible
  warning icon is supplementary.

When changing markup, re-verify the heading's accessible name is still the title text.

## Stories

`title_area.stories.tsx` renders every state inside the **full app header** (back nav,
badges, metadata, favorite) because alignment/spacing only matter in that context.
Keep new scenarios in the full-header harness rather than isolating the title. Covered:
Default, Truncated, Placeholder, Saving-and-error (async), Read-only.

## If you change this component

1. Verify read/edit have **zero** layout shift on click and while typing (short title,
   long/truncated title, empty title, placeholder).
2. Verify the empty field stays clickable, and that the first typed character behaves.
3. Verify Enter/blur save, Escape cancels, blur-after-Enter doesn't double-save, and an
   unchanged title doesn't call `onSave`.
4. Re-check the heading's accessible name and the error alert.
5. Run `node scripts/eslint --fix` and `node scripts/type_check --project` on the
   package's tsconfig.
