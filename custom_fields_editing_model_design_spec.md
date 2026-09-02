# [Cases] Sidebar field editing model — Design Spec

## Context

After 9.5.2, custom field toggles on the case detail sidebar render as static "On/Off" text until the user clicks into the section's edit mode. A customer with a toggle-heavy field configuration reports their analysts went from one interaction per flip to three (select row → flip → Save), and asks that toggles be at least visible as toggles, ideally operable directly.

The section-edit mode was built deliberately: the previous per-field model wrote the case once per field with no way back, and batching avoided racing PATCHes on one case version. This spec replaces both models with a single per-field editing model that keeps what section-edit fixed (no accidental saves, a way back) while restoring one-interaction toggles.

Scope: the legacy custom fields section and the templates-v2 field sections (global fields and template fields) on the redesigned case detail sidebar. The Attributes section (status, severity, assignees, tags, category) already follows the model this spec converges on and is unchanged.

## User story

As a triage analyst, I want to flip a case's toggle fields directly on the case view so that recording a triage decision takes one interaction, without risking accidental saves in text fields.

## Directions considered

- A — Always-live fields (Linear model): every field renders its control permanently, bounded controls auto-save, text shows per-field confirm on dirty. Rejected: sidebar becomes a heavy column of inputs; values stop being scannable; read-only diverges sharply.
- B — Quiet rows, per-field commit, live toggles (Jira model, chosen): rows stay scannable; each control commits at its natural moment; toggles are live. Chosen because it solves the customer ask, the text-safety worry, and model unification simultaneously.
- C — Keep section edit, exempt toggles: smallest diff, but embeds two commit models inside one section ("looks similar, behaves differently") and defers the model decision this spec exists to make. Rejected.

## The model

One rule, stated once: **bounded choices commit themselves; typing commits explicitly; nothing commits on blur.**

| Control | View state | Edit trigger | Commit moment | Way back |
|---|---|---|---|---|
| Toggle | Live `EuiSwitch` (compressed) as the row's value | None — always live | On flip (optimistic) | Flip again |
| Select, radio, date | Label/value row | Select the row | On choosing a value | Reopen and choose the previous value; Escape closes without committing |
| Checkbox group, user picker (multi-value) | Label/value row | Select the row | When the picker closes with changes | Escape closes without committing |
| Text, number | Label/value row | Select the row | Enter or the confirm (✓) button | Escape or the cancel (✕) button reverts; blur does nothing |
| Textarea, markdown | Label/value row | Select the row | Cmd/Ctrl+Enter or the confirm (✓) button | Escape or ✕ reverts; blur does nothing |

Every commit is one case PATCH for that field. Success feedback is the inline checkmark (spine §7) — never a success toast. Failure reverts the field to its committed value, shows an inline error, and raises a danger toast.

Retired: `SectionEditProvider`, `SectionEditBar`, the section-level buffered `pendingFields` / `modifiedKeys` / `resetTokens` machinery, and the per-field Revert button. Retained: `FieldValueRow` as the row shell, and the amber unsaved-marker styles (`useFieldMarkerStyles`) — now marking a pending text edit rather than a buffered section change.

## UX rationale

- Decision: toggles are permanently live controls. Principle: Norman — affordances; controls look like what they do. Because: a binary bounded control is its own confirmation; the interaction that changes it is already explicit, and the same sidebar's status field makes this exact argument today.
- Decision: free text requires an explicit confirm; blur never saves. Principle: Norman — error prevention through constraints. Because: half-typed values leaking into the case on a stray click was the documented failure that motivated section-edit mode; removing blur-save solves it without a mode.
- Decision: per-field commit replaces section commit. Principle: Krug — the first click must be obvious; one primary action per view. Because: the common case is changing one field; the section model taxed that case (three interactions) to optimize the rare multi-field pass.
- Decision: keep quiet label/value rows rather than always-live inputs. Principle: Krug — users scan, they don't read. Because: the sidebar is reference material beside the activity feed; a column of values scans, a column of inputs doesn't.
- Decision: toggle rows drop the row-level click/hover edit treatment. Principle: Krug — the purpose of every element is self-evident. Because: a live switch inside a clickable row creates two competing affordances one pixel apart.

## Information architecture

Unchanged at the section level: the sidebar keeps its accordion sections (Attributes, custom fields, template/global fields, Connectors), pinned headers, and resize behavior. Within the field sections:

- Each field is one row: label above value (existing `FieldValueRow` anatomy), pencil affordance at 0.5 opacity on editable non-toggle rows.
- Toggle rows: label above a live compressed `EuiSwitch` whose own label reads "On"/"Off". No pencil, no row hover tint.
- The tinted edit-mode surface, the "N unsaved" counter, and the section Save/Cancel bar are removed. The scan path is uniform: label, value, next field.
- Excluded: any per-section "Edit all" action. The multi-field pass is served by editing fields one after another; each commit is independent and immediately visible in the activity feed.

## Interaction flow (primary task: flip a toggle)

1. Analyst locates the field; the row shows the label and a live switch reading its current state.
2. Analyst flips the switch (pointer or Space when focused). The switch moves immediately (optimistic).
3. One PATCH is issued for that field. On success, a green checkmark fades in beside the value for 1.5 seconds (spine §7). The activity feed records the change.
4. On failure, the switch reverts, an inline error appears under the row, and a danger toast names the field.
5. Rapid successive flips are not blocked: the switch stays enabled during flight; per field, the last write wins.

Interaction flow (text field):

1. Analyst selects the row (pointer or Enter when focused). The row becomes a compressed input with ✓ and ✕ buttons; focus moves into the input; ✓ is disabled until the value differs from the committed value.
2. Analyst edits. The amber unsaved marker appears on the row while the value is dirty.
3. Enter or ✓ validates and commits (one PATCH); the row returns to its value state with the inline checkmark. Escape or ✕ reverts and returns to the value state. Blur does neither — the editor stays open, marked unsaved.
4. Validation failure (for example, a required field cleared) blocks the commit with an inline error; the editor stays open.

## States

- Empty: value renders "Not set" in subdued text (existing string); editable rows keep their affordance — the empty state is the invitation to fill it.
- Loading (initial): existing sidebar skeletons, unchanged.
- Saving (per field): control stays enabled with the optimistic value; checkmark on success. No spinners on bounded controls; text editor's ✓ shows `isLoading` during flight.
- Error (save): field reverts, inline error below the row, danger toast (manual dismiss). Copy under "Copy".
- Error (conflict): if the PATCH fails on a stale case version, a specific toast explains someone else updated the case, the case refetches, and any open text editors keep their local pending value so work isn't lost.
- Partial: fields with values and "Not set" rows mix freely; one visual grammar for both.
- Extremes: 20+ fields — rows are compact and the section scrolls inside the pinned panel, unchanged. 300-character text values — existing `overflow-wrap: anywhere` wrapping applies in both view and read-only states. 10+ toggles — each is independent; no cross-field state.
- Color modes: all styling through existing EUI tokens (`euiTheme.colors.warning` marker, `backgroundBaseInteractiveHover` rows); no new raw colors, both modes hold by construction.

## Permission variants

| Privilege combination | Visible | Hidden | Disabled (with shown reason) |
|---|---|---|---|
| `update` on cases | Live switches on toggle rows; edit affordance (pencil + row hover) on all other rows; text editors with ✓/✕ on demand | — | Nothing |
| `read` only | Static label/value rows for every field; toggles render as "On"/"Off" text | All edit affordances: pencils, row hover/click treatment, live switches | Nothing — spine §12, hide don't disable; a disabled switch reads as broken |

There are no per-field privileges; the variant is uniform across both field sections. The read-only layout is the same row anatomy with the affordances absent, so it reads as complete rather than stripped.

## Component choices

- Row shell: `FieldValueRow` (existing custom component, already justified) — ladder step 4, retained.
- Toggle: `EuiSwitch` compressed, `label` "On"/"Off", `showLabel` — ladder step 1.
- Select/radio: `EuiSuperSelect` opened from the row — ladder step 1. Radio groups with few options may keep `EuiRadioGroup` inline per existing control implementations.
- Date: `EuiDatePicker` opened from the row — ladder step 1.
- Checkbox group / user picker: existing controls in an `EuiPopover` anchored to the row; commit on close — ladder step 2 (composition).
- Text/number/textarea: existing `EuiFieldText`/`EuiFieldNumber`/`EuiTextArea` (compressed) plus `EuiButtonIcon` ✓ (`check`, primary) and ✕ (`cross`) — ladder step 2. This is the EUI inline-edit pattern's anatomy; `EuiInlineEdit` itself is not used because it saves on blur, which this model forbids, and its display style diverges from `FieldValueRow`. (Written justification for step 2 over the stock component.)
- Unsaved marker: existing `useFieldMarkerStyles` amber bar and dot — reused, same semantics as Advanced Settings.

## Copy

All strings sentence case, through `i18n.translate` in the owning `translations.ts` files. `{label}` is the field's configured label.

- Toggle value labels: `On` / `Off` (existing strings, reused).
- Empty value: `Not set` (existing string, reused).
- Confirm button aria-label: `Save {label}`
- Cancel button aria-label: `Cancel editing {label}`
- Row edit aria-label: `Edit {label}` (existing pattern, reused).
- Unsaved marker (screen reader): `Unsaved change`
- Required validation error (inline): `{label} is required.`
- Save failure toast — title: `Couldn't save {label}`; body: `Your change wasn't applied. Try again.`
- Conflict toast — title: `Couldn't save {label}`; body: `Someone else updated this case. Review the latest values and try again.`
- Textarea commit hint (below editor while open): `Cmd + Enter to save` / `Ctrl + Enter to save` per platform.

## Accessibility

- Keyboard path: Tab reaches each editable row (rows remain buttons) and each live switch in document order. Space flips a focused switch. Enter on a row opens its editor with focus moved into the input. Enter commits single-line text; Cmd/Ctrl+Enter commits textarea; Escape reverts and returns focus to the row.
- Focus management: commit and cancel both return focus to the row that owns the field. Nothing steals focus during a save.
- Screen reader: saves announce through a polite live region (`{label} saved`); failures announce the inline error; the unsaved marker pairs with the existing `Unsaved change` screen-reader text. Switches expose the field label through `aria-label` so "On/Off" is never the accessible name.
- The read-only variant removes rows from the tab order (plain divs, existing behavior).

## New components

None. One shared hook is extracted rather than a component: per-field commit handling (optimistic value, PATCH, checkmark timer, revert-on-error) currently lives per control; it becomes `useFieldCommit` inside the cases plugin so all field types share identical feedback semantics. Props: `commit(value)`, `status: 'idle' | 'saving' | 'saved' | 'error'`, `error`.

## Spine amendment (§6 Editing Model)

Current rule: inline edit with auto-save; "On blur or Enter, the value saves automatically."

Amended rule: editing is per field, in place, with no section or page edit mode. Bounded controls (toggle, select, radio, date, pickers) commit on choice. Free-text controls commit only on explicit confirm (Enter or the confirm button); blur never saves; Escape always reverts.

Rationale: blur is not intent. Saving half-typed text on a stray click is the failure that pushed Cases into a section-edit mode that then cost bounded controls their directness. Removing blur-save keeps auto-save semantics where they are safe and explicit commits where they are not.

Audit of affected views: case detail sidebar field sections (this spec); case title and description editors (already explicit-commit, now spine-compliant as written); Attributes section (already compliant); case creation form (unaffected — remains the stated exception).

## Critique survived

- Stressed user (triage analyst): an in-flight-disabled switch would drop rapid successive flips → switches stay enabled, optimistic value, last write wins per field.
- Stressed user (case owner, multi-field pass): N success toasts per pass would be noise → success feedback is the inline checkmark only; toasts are reserved for failures.
- Stressed user (read-only stakeholder): live switches for editors but text for readers risks a "broken" feel → read-only keeps identical row anatomy with affordances absent, per spine §12.
- Krug/Norman: live switch inside a click-to-edit row = two competing affordances → toggle rows drop the row-level click and hover treatment; the switch is the row's only control. A quiet pending text edit could be mistaken for saved → amber unsaved marker, ✓ disabled until dirty, editor never closes implicitly.
- Competitive: Jira commits text on blur — fewer clicks, steelmanned and rejected: blur-save is the documented failure this design prevents; borrowed Jira's per-field ✓/✕ anatomy and Linear's optimistic bounded commits instead. ServiceNow's whole-form save serves data-entry screens, not a live investigation sidebar.
- Agentic: the case detail MCP app's field updates map cleanly to this model — one field per `update_case_fields` call mirrors one PATCH per commit; text fallback lists `field: value` lines and suggests "set {field} to {value}". No rich-app change required by this spec.
- Edge cases: stale case version mid-edit → specific conflict toast, case refetch, open text editors keep local pending values. Required text cleared → commit blocked with `{label} is required.`; bounded controls cannot produce invalid values by construction.

## Out of scope

- The classic (non-redesign) case view keeps `ClassicEdit` untouched; it predates the redesign and is on its own deprecation path.
- The case creation flyout remains a submit-button form (spine §6 exception, unchanged).
- Activity-feed grouping of consecutive single-field updates is a worthwhile follow-up (the pack's "grouped consecutive system events" idea) but not required by this change.
