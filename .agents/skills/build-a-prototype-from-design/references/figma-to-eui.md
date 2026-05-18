# Figma → EUI component mapping

This reference is Step 1 of the "Build a prototype from this design" skill.
Its job is to resolve every design element in a mockup to its correct EUI or
kbn-ui code equivalent **before any code is written**.

For routing decisions between raw EUI and Kibana-specific wrappers, see
[`eui-vs-kbnui.md`](./eui-vs-kbnui.md).

For full prop APIs and usage examples for any resolved component, read:
`node_modules/@elastic/eui/metadata/components/[name].json`

---

## How to use this reference

### Mode A — Figma file URL provided

1. Call `get_design_context(url)` via the Figma MCP to extract the layer tree.
2. Call `get_code_connect_map()` to check for any existing Code Connect mappings.
3. For each component layer, match its name against the **Figma layer name**
   column in the table below.
4. Use the resolved EUI/kbn-ui name as the output for Step 2 of the skill.

### Mode B — Screenshot (PNG / JPG) provided

1. Scan the image systematically: chrome first → page structure → sections
   → micro-components. Follow the scan order in
   [`mockup-reading.md`](./mockup-reading.md).
2. For each visual element, match what you see against the
   **Visual signal** column in the table below.
3. When two components look identical in a screenshot, use the
   **Disambiguation** column to decide.
4. Flag anything that cannot be determined from visual evidence alone —
   list both candidates and the deciding factor rather than guessing silently.

---

## Mapping table

> ⚠️ **Figma layer names** — marked with 🔍 where the exact Figma library
> naming needs verification by the EUI design team. EUI code names and visual
> signals are reliable; correct any 🔍 entries before the Day 4 test.

### Buttons

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Button / Primary` | `EuiButton fill` | No | Solid colored background, rounded corners, text label | Filled = primary action |
| `Button / Default` | `EuiButton` | No | Outlined border, transparent bg, text label | No fill = secondary action |
| `Button / Empty` | `EuiButtonEmpty` | No | Text only, no border or background | Looks like a link but has button padding |
| `Button / Icon` | `EuiButtonIcon` | No | Icon only, no text label visible | Always add `aria-label` |
| `Button / Icon + Label` | `EuiButton iconType=…` | No | Icon left/right of text label inside a button box | Combined icon+label variant |
| `Button Group` | `EuiButtonGroup` | No | Row of adjacent buttons sharing borders | Toggle group, not separate buttons |

### Display & status

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Badge` | `EuiBadge` | No | Pill shape, rounded ends, colored fill, short text | Has a container. NOT EuiHealth (dot only) |
| `Badge / Notification` | `EuiNotificationBadge` | No | Small circle with a number, typically on a button | Count indicator, not a status label |
| `Callout / Info` | `EuiCallOut color="primary"` | No | Box with blue left border accent + icon | NOT a panel (no shadow) |
| `Callout / Success` | `EuiCallOut color="success"` | No | Box with green left border | |
| `Callout / Warning` | `EuiCallOut color="warning"` | No | Box with yellow left border | |
| `Callout / Danger` | `EuiCallOut color="danger"` | No | Box with red left border | |
| `Health` | `EuiHealth` | No | Small colored dot + inline text label | NOT EuiBadge (no pill, just a dot) |
| `Stat` | `EuiStat` | No | Large metric value + small descriptor label | Always paired label+value. NOT EuiTitle |
| `Avatar` | `EuiAvatar` | No | Circular element with initials or image | NOT EuiIcon (circular, not square) |
| `Token` | `EuiToken` | No | Small colored icon in a rounded square container | Used in search results and field lists |
| `Loading / Spinner` | `EuiLoadingSpinner` | No | Animated circle arc | |
| `Loading / Elastic` | `EuiLoadingElastic` | No | Animated Elastic logo mark | |
| `Empty Prompt` | `EuiEmptyPrompt` | No | Centered illustration + heading + body + CTA buttons | Large, page-filling. NOT EuiCallOut |
| `Toast` | `EuiToast` | No | Small floating notification at screen edge | NOT EuiCallOut (positioned/floating) |

### Layout & containers

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Panel` | `EuiPanel` | No | White/light card with border or shadow, internal padding | No colored left border. NOT EuiCallOut |
| `Panel / Split` | `EuiSplitPanel` | No | Two-pane panel with a shared border divider | |
| `Flex Row` | `EuiFlexGroup` + `EuiFlexItem` | No | Horizontal arrangement of children with consistent gaps | Invisible in screenshots — infer from layout |
| `Spacer` | `EuiSpacer` | No | Vertical whitespace block | Invisible — infer from gaps between elements |
| `Horizontal Rule` | `EuiHorizontalRule` | No | Full-width divider line | Use instead of `<hr>` |
| `Flyout` | `EuiFlyout` | No | Full-height panel sliding from viewport edge, dark overlay | NOT EuiModal (edge-anchored, not centered) |
| `Modal` | `EuiModal` | No | Centered dialog over dark full-viewport overlay | NOT EuiFlyout (centered, not edge-anchored) |
| `Popover` | `EuiPopover` | No | Small floating panel anchored to a trigger element | NOT EuiModal (small, trigger-anchored) |

### Page structure

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Page Template` | — | **Yes → `KibanaPageTemplate`** | Full-page scaffold: sidebar + header + content | Never use `EuiPageTemplate` in Kibana |
| `Page Header` | — | **Yes → `KibanaPageHeader`** 🔍 | Page-level title bar with breadcrumbs + actions | Never use `EuiPageHeader` in Kibana. See `eui-vs-kbnui.md` |
| `Page Section` | `EuiPageSection` | No | Content region within the page body | |
| `No Data` | — | **Yes → `KibanaNoDataPage`** | Full-page empty state with data onboarding | From `@kbn/shared-ux-page-kibana-no-data` |

### Navigation

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Breadcrumbs` | `EuiBreadcrumbs` | No | Text items separated by › chevrons, last item plain | NOT EuiTabs, NOT EuiSteps |
| `Tabs` | `EuiTabs` + `EuiTab` | No | Horizontal row of text tabs, active has underline | NOT EuiButtonGroup (tabs are non-exclusive nav) |
| `Steps` | `EuiSteps` | No | Numbered vertical or horizontal progression | NOT EuiTabs (sequential, not navigational) |
| `Side Nav` | `EuiSideNav` | No | Vertical tree menu with collapsible groups | App-level persistent nav |
| `Solution Nav` | — | **Yes → `SolutionNav`** | Left-rail navigation in solution-scoped layouts | From `@kbn/shared-ux-page-solution-nav` |
| `Pagination` | `EuiPagination` | No | Row of numbered page buttons with prev/next arrows | |
| `Link` | `EuiLink` | No | Underlined or colored inline text link | NOT EuiButtonEmpty (not inline in text) |

### Forms

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Form Row` | `EuiFormRow` | No | Label + input + help/error text stacked vertically | Always wraps an input |
| `Field / Text` | `EuiFieldText` | No | Single-line bordered text input | NOT EuiTextArea (single line) |
| `Field / Number` | `EuiFieldNumber` | No | Numeric text input | |
| `Field / Password` | `EuiFieldPassword` | No | Password input with eye toggle icon | |
| `Field / Search` | `EuiFieldSearch` | No | Narrow search input with magnifier icon | Narrower than EuiSearchBar |
| `Select` | `EuiSelect` | No | Native dropdown with chevron | No in-field pills. NOT EuiComboBox |
| `Combo Box` | `EuiComboBox` | No | Input with pill-shaped selected items inside, chevron | In-field pills = EuiComboBox |
| `Search Bar` | `EuiSearchBar` | No | Full-width search with filter pills, prominent | Wider/more prominent than EuiFieldSearch |
| `Switch` | `EuiSwitch` | No | Toggle pill with a sliding thumb, label alongside | NOT EuiCheckbox (pill shape vs square) |
| `Checkbox` | `EuiCheckbox` | No | Square tick box | |
| `Radio` | `EuiRadio` | No | Circular selection dot | |
| `Text Area` | `EuiTextArea` | No | Multi-line bordered text input | NOT EuiFieldText (multi-line) |

### Data

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Table / Basic` | `EuiBasicTable` | No | Header row + data rows, sort arrows, row actions | Visually identical to EuiInMemoryTable — differs by data source |
| `Table / In Memory` | `EuiInMemoryTable` | No | Same visual as Basic Table + inline search/filter | Use when filtering/sorting is client-side |
| `Data Grid` | `EuiDataGrid` | No | Cell-level editing, column resize handles, toolbar above | More complex than EuiBasicTable |
| `Description List` | `EuiDescriptionList` | No | Key: value pairs stacked or inline | NOT a table (no columns/rows) |

### Typography

| Figma layer name 🔍 | EUI component | kbn-ui instead? | Visual signal | Disambiguation |
|---|---|---|---|---|
| `Title / XL–XXS` | `EuiTitle size="…"` | No | Large/heavy heading text, no background | Use `as` prop to set h1–h6 semantic level |
| `Text` | `EuiText` | No | Regular body copy, may contain paragraphs and lists | |
| `Code` | `EuiCode` | No | Inline monospace code snippet | NOT EuiCodeBlock (inline vs block) |
| `Code Block` | `EuiCodeBlock` | No | Multi-line syntax-highlighted code with copy button | |

---

## Output format

After resolving all components from the design, produce a structured list
before moving to Step 2. Example:

```
Resolved components:
- Page scaffold       → KibanaPageTemplate  (@kbn/shared-ux-page-kibana-template)
- Page header         → KibanaPageHeader    (verify import — see eui-vs-kbnui.md)
- Alert banner        → EuiCallOut color="warning"
- Data table          → EuiBasicTable       (server-side data — 3 columns visible)
- Row action buttons  → EuiButtonIcon       (2 per row, need aria-label)
- Status column       → EuiHealth           (3 states: success / warning / danger)
- Primary CTA         → EuiButton fill
- Cancel action       → EuiButtonEmpty
UNCERTAIN:
- Top search area     → EuiSearchBar OR EuiFieldSearch — cannot determine width context from screenshot
```

Anything marked UNCERTAIN must be resolved with the product designer or
inferred from surrounding layout context before scaffolding begins.
