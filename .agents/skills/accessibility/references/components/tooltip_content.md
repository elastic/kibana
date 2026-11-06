# EUI tooltip content: no interactive elements

**Applies to:** `EuiToolTip`, `EuiIconTip` — the `content` and `title` props

Tooltip `content` and `title` render inside a portal with `role="tooltip"`. The overlay only appears while the trigger is hovered or focused and is dismissed on blur, so any focusable element placed inside it is unreachable by keyboard and assistive-technology users. Use **`EuiPopover`** when the content needs to be interactive.

**Related guides:** **`overlays.md`** (`EuiPopover` for interactive content) · **`tooltip_icon.md`** (wrapping `EuiButtonIcon` with `EuiToolTip`) · **`icons_and_tooltips.md`** (`EuiIconTip` vs `EuiToolTip` + `EuiIcon`).

## Canonical usage

- `EuiToolTip` / `EuiIconTip` `content` and `title` may contain:
  - **Plain strings** (preferred — easy to localize and read).
  - **Non-interactive JSX** — text nodes, `<span>`, `<p>`, `EuiText`, `EuiIcon`, and the display-only badges/cards (`EuiBadge`, `EuiBetaBadge`, `EuiCard`) used **without** `onClick` / `href`.
- They must **not** contain anything focusable:
  - Native `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`.
  - Interactive EUI components — `EuiLink`, `EuiButton`, `EuiButtonEmpty`, `EuiButtonIcon`, `EuiFieldText`, `EuiFieldNumber`, `EuiFieldSearch`, `EuiFieldPassword`, `EuiTextArea`, `EuiSelect`, `EuiSuperSelect`, `EuiComboBox`, `EuiSelectable`, `EuiSwitch`, `EuiCheckbox`, `EuiRadio`, `EuiRange`, `EuiDualRange`, `EuiColorPicker`, `EuiDatePicker`, `EuiSuperDatePicker`, `EuiFilterButton`, `EuiPagination`, `EuiTab`, `EuiTreeView`, `EuiContextMenuItem`, `EuiKeyPadMenuItem`, `EuiListGroupItem`, `EuiBreadcrumbs`, `EuiBasicTable`, `EuiInMemoryTable`, `EuiCheckableCard`, …
- The rule searches recursively — interactive elements nested inside fragments, conditional renders (`cond && …`, `cond ? … : …`), or wrapper elements are reported too.
- When users need to interact with the content (click a link, fill a field), switch the wrapper to **`EuiPopover`** triggered by an explicit click — never by hover.

### Manual-review cases (rule is silent)

- **Variable content** — `content={tooltipContent}` / `title={titleNode}` is intentionally skipped because it cannot be statically analyzed. Trace the variable and verify it never holds focusable JSX.
- **Conditionally-interactive components** — `EuiBadge`, `EuiBetaBadge`, `EuiCard` are excluded from the rule because they render as a plain element without `onClick` / `href`. As soon as you add `onClick` or `href`, they become focusable and the same restriction applies — move the interaction out of the tooltip.

## Examples

```tsx
<EuiToolTip content="Just text">
  <EuiButton>Hover me</EuiButton>
</EuiToolTip>

<EuiToolTip content={<EuiText><p>Description</p></EuiText>}>
  <EuiButton>Hover me</EuiButton>
</EuiToolTip>

<EuiIconTip content="Informational text" type="info" />

// Display-only badge is fine
<EuiToolTip content={<EuiBadge>v2.0</EuiBadge>}>
  <EuiButton>Hover me</EuiButton>
</EuiToolTip>
```

## Common mistakes

```tsx
// WRONG — link inside tooltip is not keyboard-reachable
<EuiToolTip content={<EuiLink href="/docs">Learn more</EuiLink>}>
  <EuiButton>Hover me</EuiButton>
</EuiToolTip>

// RIGHT — switch to EuiPopover so the link participates in the focus order
const [isOpen, setIsOpen] = useState(false);
const togglePopover = () => setIsOpen((open) => !open);
const closePopover = () => setIsOpen(false);

<EuiPopover
  button={<EuiButton onClick={togglePopover}>More info</EuiButton>}
  isOpen={isOpen}
  closePopover={closePopover}
>
  <EuiLink href="/docs">Learn more</EuiLink>
</EuiPopover>

// WRONG — button inside `EuiIconTip` content
<EuiIconTip content={<EuiButton>Click</EuiButton>} type="info" />

// RIGHT — keep the icon tip purely informational
<EuiIconTip content="Informational text" type="info" />

// WRONG — interactive element inside `title` is also reported
<EuiToolTip title={<EuiLink href="#">Learn more</EuiLink>} content="Info">
  <EuiButton>Hover</EuiButton>
</EuiToolTip>

// WRONG — interactive child wrapped in a fragment is reported recursively
<EuiToolTip content={<><span>Text</span><EuiLink href="#">Link</EuiLink></>}>
  <EuiButton>Hover</EuiButton>
</EuiToolTip>

// WRONG — interactive child behind `cond && …` is reported
<EuiToolTip content={<span>{cond && <EuiLink href="#">Link</EuiLink>}</span>}>
  <EuiButton>Hover</EuiButton>
</EuiToolTip>

// WRONG — interactive child inside a ternary is reported
<EuiToolTip content={cond ? <EuiLink href="#">Link</EuiLink> : null}>
  <EuiButton>Hover</EuiButton>
</EuiToolTip>

// WRONG — conditionally-interactive badge with onClick becomes focusable
<EuiToolTip content={<EuiBadge onClick={onClick}>Open</EuiBadge>}>
  <EuiButton>Hover</EuiButton>
</EuiToolTip>
```
