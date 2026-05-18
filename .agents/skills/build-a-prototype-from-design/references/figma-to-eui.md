# Figma → EUI component mapping

This reference is Step 1 of the "Build a prototype from this design" skill.
Its job is to resolve every design element to its correct EUI or kbn-ui
equivalent **before any code is written**.

For routing decisions between raw EUI and Kibana-specific wrappers, see
[`eui-vs-kbnui.md`](./eui-vs-kbnui.md).

For full prop APIs, usage examples, and detailed visual descriptions, read:
`node_modules/@elastic/eui/metadata/components/[name].json`

---

## Mode A — Figma file URL provided

Code Connect handles the Figma component → code mapping automatically.

1. Call `get_design_context(url)` to extract the layer tree.
2. Call `get_code_connect_map()` to get the Figma → EUI mappings.
3. For any components not covered by Code Connect, call `get_code_connect_suggestions()`.
4. Check each resolved component against [`eui-vs-kbnui.md`](./eui-vs-kbnui.md)
   to confirm whether to use the raw EUI component or a Kibana wrapper.

---

## Mode B — Screenshot (PNG / JPG) provided

Scan the image systematically: **chrome first → page structure → sections →
micro-components**. Follow the scan order in
[`mockup-reading.md`](./mockup-reading.md). <!-- TODO: Person C deliverable -->

For each visual element, match what you see against the table below.
When two components look similar, use the **Disambiguation** column.
For more detail on any entry, read the `visualDescription` field in
`node_modules/@elastic/eui/metadata/components/[name].json`.

Flag anything that cannot be determined from visual evidence alone — list
both candidates and the deciding factor rather than guessing silently.

---

## Visual recognition table

### Buttons

| What you see | EUI component | Disambiguation |
|---|---|---|
| Solid colored background, rounded corners, text label | `EuiButton fill` | Filled = primary action |
| Outlined border, transparent background, text label | `EuiButton` | No fill = secondary |
| Text only, no border or background, button padding | `EuiButtonEmpty` | Looks like a link — has padding |
| Icon only, no text label | `EuiButtonIcon` | Always needs `aria-label` |
| Icon + text label inside a button box | `EuiButton iconType=…` | |
| Row of adjacent buttons sharing borders | `EuiButtonGroup` | Toggle group, not separate buttons |

### Display & status

| What you see | EUI component | Disambiguation |
|---|---|---|
| Pill shape, rounded ends, colored fill, short text | `EuiBadge` | Has a container. NOT EuiHealth (dot only) |
| Small circle with a number, on or near a button | `EuiNotificationBadge` | Count indicator, not a status label |
| Box with colored left border accent + icon + title | `EuiCallOut` | Color = info/success/warning/danger. NOT EuiPanel (no shadow) |
| Small colored dot + short inline text label | `EuiHealth` | Just a dot. NOT EuiBadge (no pill shape) |
| Large metric value + small descriptor label | `EuiStat` | Always a paired label+value. NOT EuiTitle alone |
| Circular element with initials or image | `EuiAvatar` | Circular. NOT EuiIcon (square) |
| Small colored icon in a rounded square container | `EuiToken` | Used in search results and field lists |
| Animated circle arc | `EuiLoadingSpinner` | |
| Centered illustration + heading + body + CTA buttons | `EuiEmptyPrompt` | Large, page-filling. NOT EuiCallOut (not an alert strip) |
| Small floating notification at screen edge | `EuiToast` | Floating/positioned. NOT EuiCallOut |

### Layout & containers

| What you see | EUI component | Disambiguation |
|---|---|---|
| White/light card, border or shadow, internal padding | `EuiPanel` | No colored left border. NOT EuiCallOut |
| Two-pane container with a shared border divider | `EuiSplitPanel` | |
| Children in a horizontal row with consistent gaps | `EuiFlexGroup` + `EuiFlexItem` | Invisible — infer from layout spacing |
| Vertical whitespace gap between elements | `EuiSpacer` | Invisible — infer from the gap |
| Full-width horizontal divider line | `EuiHorizontalRule` | |
| Full-height panel sliding from viewport edge, dark overlay | `EuiFlyout` | Edge-anchored. NOT EuiModal (centered) |
| Centered dialog over full-viewport dark overlay | `EuiModal` | Centered. NOT EuiFlyout (edge-anchored) |
| Small floating panel anchored to a trigger | `EuiPopover` | Small, trigger-anchored. NOT EuiModal |

### Page structure

| What you see | EUI component | Disambiguation |
|---|---|---|
| Full-page scaffold: sidebar + header + content area | `KibanaPageTemplate` | Never use `EuiPageTemplate` in Kibana |
| Page-level title bar with breadcrumbs + action buttons | See [`eui-vs-kbnui.md`](./eui-vs-kbnui.md) | Pattern varies by solution |
| Full-page empty state with data onboarding flow | `KibanaNoDataPage` | First-time / no data source. NOT EuiEmptyPrompt |
| Content region inside the page body | `EuiPageSection` | |

### Navigation

| What you see | EUI component | Disambiguation |
|---|---|---|
| Text items separated by › chevrons, last item plain | `EuiBreadcrumbs` | NOT EuiTabs, NOT EuiSteps |
| Horizontal row of text tabs, active has underline | `EuiTabs` + `EuiTab` | NOT EuiButtonGroup |
| Numbered vertical or horizontal progression | `EuiSteps` | Sequential. NOT EuiTabs |
| Vertical tree menu with collapsible groups | `EuiSideNav` | Persistent app nav |
| Persistent left-rail nav scoped to a solution | `SolutionNav` | NOT EuiSideNav directly — see `eui-vs-kbnui.md` |
| Row of numbered page buttons with prev/next | `EuiPagination` | |
| Underlined or colored inline text within a sentence | `EuiLink` | Inline in text. NOT EuiButtonEmpty |

### Forms

| What you see | EUI component | Disambiguation |
|---|---|---|
| Label + input + help/error text stacked vertically | `EuiFormRow` | Always wraps an input |
| Single-line bordered text input | `EuiFieldText` | Single line. NOT EuiTextArea |
| Password input with eye-toggle icon | `EuiFieldPassword` | |
| Narrow input with magnifier icon | `EuiFieldSearch` | Narrower than EuiSearchBar |
| Native dropdown with chevron, no pills | `EuiSelect` | No in-field pills. NOT EuiComboBox |
| Input with pill-shaped selected items inside + chevron | `EuiComboBox` | In-field pills = EuiComboBox. NOT EuiSelect |
| Full-width search with filter pills, prominent | `EuiSearchBar` | Wider and more prominent than EuiFieldSearch |
| Toggle pill with sliding thumb + label | `EuiSwitch` | Pill shape. NOT EuiCheckbox (square) |
| Square tick box | `EuiCheckbox` | |
| Circular selection dot | `EuiRadio` | |
| Multi-line bordered text input | `EuiTextArea` | Multi-line. NOT EuiFieldText |

### Data

| What you see | EUI component | Disambiguation |
|---|---|---|
| Header row + data rows, sort arrows, row actions | `EuiBasicTable` or `EuiInMemoryTable` | Visually identical — use EuiInMemoryTable only if filtering is client-side |
| Cell-level editing, column resize handles, toolbar above | `EuiDataGrid` | More complex than EuiBasicTable |
| Key: value pairs, stacked or inline | `EuiDescriptionList` | NOT a table |

### Typography

| What you see | EUI component | Disambiguation |
|---|---|---|
| Large or heavy heading text, no background | `EuiTitle` | Use `as` prop to set heading level |
| Regular body copy, paragraphs or lists | `EuiText` | |
| Inline monospace code snippet | `EuiCode` | Inline. NOT EuiCodeBlock |
| Multi-line syntax-highlighted code with copy button | `EuiCodeBlock` | Block. NOT EuiCode |

---

## Output format

After resolving all components, produce this structured list before moving
to Step 2:

```
Resolved components:
- Page scaffold       → KibanaPageTemplate  (@kbn/shared-ux-page-kibana-template)
- Page header         → [see eui-vs-kbnui.md — verify with solution team]
- Alert banner        → EuiCallOut color="warning"
- Data table          → EuiBasicTable       (server-side data, 3 columns)
- Row action buttons  → EuiButtonIcon       (2 per row — need aria-label)
- Status column       → EuiHealth           (success / warning / danger)
- Primary CTA         → EuiButton fill
- Cancel action       → EuiButtonEmpty

UNCERTAIN:
- Top search area     → EuiSearchBar OR EuiFieldSearch
                        cannot determine width context from screenshot alone
```

Anything marked UNCERTAIN must be resolved before scaffolding begins.
