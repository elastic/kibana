# @kbn/flyout-template

Structured layout shell for Kibana flyouts: a declarative compound component that assembles a header, body, and footer into a consistently spaced `EuiFlyout`.

## Usage

```tsx
import { FlyoutTemplate } from '@kbn/flyout-template';

<FlyoutTemplate onClose={onClose} size="m">
  <FlyoutTemplate.Header
    title="Service details"
    titleIcon="info"
    titleTooltip="Additional context about this flyout."
    description="Mar 30, 2022 @ 10:01:21.313"
  />
  <FlyoutTemplate.Body>
    <MyFilterBar />
    <MyDataGrid />
  </FlyoutTemplate.Body>
  <FlyoutTemplate.Footer>
    <FlyoutTemplate.Footer.SecondaryAction label="Discard" onClick={onDiscard} />
    <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={onSave} />
  </FlyoutTemplate.Footer>
</FlyoutTemplate>
```

## Root props

The root accepts every `EuiFlyoutProps` prop, as well as any `data-*` attributes, with three exceptions: `children` instead names the declarative zones, `flyoutMenuDisplayMode` is fixed to `auto`, and `ref` is not forwarded. `size` defaults to `m` and `session` defaults to `start`. When `flyoutMenuProps` is set, the template derives a `title` from the string `FlyoutTemplate.Header` title and merges it before forwarding. An explicit `flyoutMenuProps.title` overrides this. `aria-label` and `aria-labelledby` are both accepted, but the template resolves them against the header title rather than forwarding them untouched — see [Behavior](#behavior).

Tab selection props also live on the root: `selectedTabId` (controlled), `defaultSelectedTabId` (uncontrolled initial), and `onTabChange` (called on every tab click either way). See [Tabs](#tabs) below.

## Zones

**`FlyoutTemplate.Header`** renders three stacked regions: an always-visible title row, a collapsible region holding the description, and an always-visible trailing region with the full-bleed bottom divider. See [`src/header/README.md`](src/header/README.md) for header blocks (MetaBlock, Badge, InfoBlock) and collapse behavior.

- `title` — required `ReactNode`. Rendered as an `<h3>` carrying a generated id.
- `titleIcon` — EUI icon type rendered after the title. Without `titleTooltip` it is decorative (`aria-hidden`).
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip` using `titleIcon` as its type, defaulting to `info`.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. Not wrapped in a `<p>`, so block content is valid.
- `collapsed` — renders the compact layout permanently, regardless of scroll position.
- `children` — `Header.MetaBlock`, `Header.Badge`, and `Header.InfoBlock` parts. Free-form content (arbitrary elements, components, bare text) is not rendered, and the assembly library warns in development about unrecognized children.

**`FlyoutTemplate.Body`** renders `Body.Section`, `Body.Accordion`, and `Body.TabPanel` parts alongside arbitrary passthrough content inside `EuiFlyoutBody`, in source order. Passthrough children manage their own layout; the template adds no sectioning, titling, or dividers around them. See [`src/body/README.md`](src/body/README.md) for sections and unstructured content, and [Tabs](#tabs) below.

**`FlyoutTemplate.Footer`** renders a primary and secondary action right-aligned inside `EuiFlyoutFooter`, secondary first. If no action is present, the footer is omitted entirely — no default Cancel button is added. Only the first instance of each action is rendered; for `PrimaryActionMenu` specifically, the first instance that actually has panels wins. `PrimaryAction` and `PrimaryActionMenu` are mutually exclusive. An empty `panels` array on `PrimaryActionMenu` counts as absent, so a lone empty menu omits the footer without warning.

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as a filled `EuiButton`.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.
- `FlyoutTemplate.Footer.PrimaryActionMenu` — rendered as a filled `EuiButton` that opens an `EuiContextMenu` in a popover above the footer. See [Primary action menu](#primary-action-menu) below.

All three `label` props are `string`, not `ReactNode`.

`PrimaryAction` and `SecondaryAction` accept `label`, `onClick`, an optional `id`, any `data-*` attributes, and the remaining `EuiButton` props such as `iconType`, `iconSide`, `isLoading`, `isDisabled`, `contentProps`, and `textProps`. Both are typed from EUI's button-only props, so an action always renders a button and the anchor props are not reachable. The template owns appearance and sizing: `children`, `color`, `element`, `fill`, `fullWidth`, `size`, and `buttonRef` are not accepted, and `flush` is not offered on `SecondaryAction`. `PrimaryAction` also takes `minWidth`, which `EuiButtonEmpty` does not support. The `id` is forwarded to the button element.

### Primary action menu

```tsx
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';

const panels: FlyoutFooterMenuPanel[] = useMemo(() => [
  {
    id: 0,
    items: [
      { name: 'Edit', icon: 'pencil', onClick: onEdit },
      { name: 'Delete', icon: 'trash', onClick: onDelete },
    ],
  },
], [onEdit, onDelete]);

<FlyoutTemplate.Footer>
  <FlyoutTemplate.Footer.SecondaryAction label="Cancel" onClick={onCancel} />
  <FlyoutTemplate.Footer.PrimaryActionMenu label="Take action" panels={panels} />
</FlyoutTemplate.Footer>
```

`panels` is EUI's own descriptor array, narrowed as follows:

- `content` and item `renderItem` are not supported (`?: never`); both are rejected at the type level.
- `items` is required (with `content` gone, a panel with no items is always a mistake).
- Panel `title` and item `name` are `string`, not `ReactNode`. Annotate the array as `FlyoutFooterMenuPanel[]` — using EUI's own type bypasses these narrowings.
- A nested panel (one opened from another panel's item) must have a `title`: it is what EUI uses to draw the back button. The template warns in development for any nested panel that lacks one.

Behavior:

- The menu always opens upward and flush with the button's right edge (`anchorPosition="upRight"`). This is fixed and reflects the footer's position; it is not a prop.
- Picking an item closes the menu. Set `closeOnItemClick={false}` to opt out. Items that open a nested panel (`item.panel`) and separators are never auto-closed regardless.
- The menu reopens on the initial panel after each close. The panel the menu opens on defaults to `panels[0].id`; pass `initialPanelId` to override.
- Every behavioral `EuiContextMenu` prop is forwarded: `initialPanelId`, `onPanelChange`, `height`. Its styling surface (`className`, `css`, `panelPaddingSize`, `anchorPosition`) is not.
- **Memoize `panels`**: `EuiContextMenu` rebuilds its internal keyboard-navigation map when `panels` changes identity. A new array on every render resets arrow-key focus tracking while the menu is open.

| Prop | Type | Notes |
| --- | --- | --- |
| `label` | `string` | Trigger button label. The chevron is supplied by the template. |
| `panels` | `FlyoutFooterMenuPanel[]` | Menu contents. |
| `initialPanelId` | `string \| number` | Defaults to `panels[0].id`. |
| `onPanelChange` | `EuiContextMenuProps['onPanelChange']` | Forwarded unchanged. |
| `height` | `CSSProperties['height']` | Fixed menu height with internal scrolling. |
| `closeOnItemClick` | `boolean` | Defaults to `true`. |
| `id` | `string` | Forwarded to the trigger button. |
| `aria-label` | `string` | Overrides the popover dialog's derived name (`"{label} menu"`). |
| `data-test-subj` | `string` | Forwarded to the trigger; the popover panel gets `${value}Panel`. |
| everything else on `EuiButton` | — | Forwarded to the trigger, e.g. `isLoading`, `isDisabled`, `className`, `css`, and any `data-*` attribute. |

The template sets `children`, `fill`, `iconType`, `iconSide`, `element`, `aria-haspopup`, and the click handler on the trigger itself, so those are rejected at the type level rather than silently ignored. `color` and `size` are rejected as well, keeping every footer action on one appearance. `isSelected` is rejected too: it applies `aria-pressed`, which describes a toggle button, whereas a popover trigger is described by the `aria-expanded` EUI already sets. `type` is rejected and pinned to `"button"`, so a trigger placed inside a `<form>` opens the menu without submitting it.

## Behavior

- The generated header title id is used for `EuiFlyout`'s `aria-labelledby` only as a fallback: an explicit `aria-labelledby` wins, and an explicit `aria-label` suppresses it. With no labeling props and a header present, the flyout is labeled by the title without a separate `aria-label`.
- A string `title` is forwarded to EUI's flyout menu as the history entry title, and is used as the `aria-label` fallback when the flyout is not labeled by the title id. An explicit `flyoutMenuProps.title` overrides it. A non-string `title` does neither.
- The header's bottom divider bleeds to the flyout edges using the root `paddingSize`; it aligns with the flyout chrome regardless of which padding size is active.
- `FlyoutTemplate.Body` is required. Omitting it logs a dev warning. The header and footer are optional.
- Duplicate zones (e.g. two `FlyoutTemplate.Header` children) log a dev warning and render only the first.
- The zone components (`Header`, `Body`, `Footer`) and the footer action parts (`PrimaryAction`, `SecondaryAction`, `PrimaryActionMenu`) render nothing when used outside a `FlyoutTemplate` root.

## Tabs

Pass `tabs` to the root to render a tab bar at the bottom of the header. Each entry takes an `id` (the logical tab id used to match a `Body.TabPanel`, distinct from the auto-generated DOM `id`) and a `label`. It also accepts any `data-*` attributes and the rest of `EuiTabProps` (such as `disabled`, `prepend`, `append`, `className`, `css`, `aria-label`, `data-test-subj`). The template owns `aria-controls`, `children`, `isSelected`, and `onClick`, so an entry cannot set them: selection derives from the root and clicks route through `onTabChange`. Declare a `Body.TabPanel` for each tab id; the template wires the `tab`/`tabpanel` accessibility relationship and mounts only the selected panel.

```tsx
<FlyoutTemplate
  onClose={onClose}
  tabs={[
    { id: 'overview', label: 'Overview' },
    { id: 'metadata', label: 'Metadata' },
  ]}
  selectedTabId={tabId}
  onTabChange={setTabId}
>
  <FlyoutTemplate.Header title="Alert details" />
  <FlyoutTemplate.Body>
    <FlyoutTemplate.Body.TabPanel tabId="overview">…</FlyoutTemplate.Body.TabPanel>
    <FlyoutTemplate.Body.TabPanel tabId="metadata">…</FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

Selection is uncontrolled by default, starting on the first tab; pass `defaultSelectedTabId` to start elsewhere. For controlled selection pass `selectedTabId` and `onTabChange` — `onTabChange` fires on every tab click either way.

For conditional or dynamically-loaded content, supply only the panel for the currently selected tab:

```tsx
<FlyoutTemplate tabs={tabs} selectedTabId={tabId} onTabChange={setTabId} …>
  <FlyoutTemplate.Header title="Alert details" />
  <FlyoutTemplate.Body>
    <FlyoutTemplate.Body.TabPanel tabId={tabId}>{panelFor(tabId)}</FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

**Behaviors:**

- Non-empty `tabs` activates tabbed mode: the bar renders, only the selected panel mounts, and top-level `Body` passthrough content is ignored.
- A tab whose panel is absent still renders and stays selectable; the body renders empty. This is the on-demand mounting path and is never warned about.
- A `Body.TabPanel` declared when `tabs` is empty or omitted is silently ignored — tabbed mode is off and only passthrough children render.
- Only the selected panel mounts; panel state is discarded on every tab switch. There is no keep-mounted escape hatch.
- Duplicate ids in `tabs` are silently deduplicated; the first entry with each id wins.
- Setting `tabs` without a `<FlyoutTemplate.Header>` logs a dev warning: the tab bar cannot render without a header zone.

## Test subjects

Zone subjects derive from the root `data-test-subj` prop with a zone suffix, and each zone's own `data-test-subj` overrides it. With no root `data-test-subj`, zones get none unless set explicitly.

| Zone | Default subject | Override prop |
| --- | --- | --- |
| Header | `${root}Header` | `FlyoutTemplate.Header` `data-test-subj` |
| Body | `${root}Body` | `FlyoutTemplate.Body` `data-test-subj` |
| Footer | `${root}Footer` | `FlyoutTemplate.Footer` `data-test-subj` |

Footer action buttons are not derived; their `data-test-subj` passes through to the button as given.

## Opening a flyout imperatively

`core.overlays.openFlyoutTemplate` takes the template's root props and a component that renders `FlyoutTemplate` with its zones. Because the component renders the template itself, the zones are literal children of it and every rule documented above still applies.

```tsx
const AlertDetails = ({ onClose }) => {
  const alert = useAlert();

  return (
    <FlyoutTemplate onClose={onClose}>
      <FlyoutTemplate.Header title="Alert details" />
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.Section title="Summary">
          <AlertSummary alert={alert} />
        </FlyoutTemplate.Body.Section>
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};

core.overlays.openFlyoutTemplate({ size: 'm', session: 'start' }, AlertDetails);
```

The component is a real React boundary, so it may use hooks and re-render. `onClose` is the only root prop it sets — it stays required so a `FlyoutTemplate` can never be rendered without a way to dismiss it — and it arrives as a prop on the content component. Every other root prop comes from `FlyoutTemplateManagedProvider` (fed by the options argument) regardless of what the content component passes to `FlyoutTemplate`; extra root props on the element are ignored and warn in development. See `@kbn/core-overlays-browser` for the full signature.

Wrapping `onClose` is fine; declining to call it does not keep the flyout open. EUI's flyout manager routes the close button, history navigation, and cascade closes through that prop and has already removed the flyout by the time a handler runs, so the template tears down regardless. `useFlyoutClose` is available for content nested too deeply to receive the prop.

**A part written inside another component does not render.** Parts are identified by parsing direct JSX children, so one returned from inside a component sits behind a boundary the parser cannot see through and silently renders nothing. Keep parts in the JSX of the zone that parses them, and put your own components inside those parts.
