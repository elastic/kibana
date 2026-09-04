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

The root forwards a fixed subset of `EuiFlyoutProps` — `id`, `hasChildBackground`, `onClose`, `size`, `minWidth`, `maxWidth`, `type`, `paddingSize`, `ownFocus`, `resizable`, `onResize`, `outsideClickCloses`, `focusTrapProps`, `closeButtonProps`, `session`, `historyKey`, `onActive`, `flyoutMenuProps` — plus `aria-label`, `aria-labelledby`, and `data-test-subj`. Anything not in that list is not accepted. `size` defaults to `m` and `session` defaults to `start`; `flyoutMenuDisplayMode` is fixed to `auto` and is not configurable.

Tab selection props also live on the root: `selectedTabId` (controlled), `defaultSelectedTabId` (uncontrolled initial), and `onTabChange` (called on every tab click either way). See [`src/header/tab/README.md`](src/header/tab/README.md).

## Zones

**`FlyoutTemplate.Header`** renders three stacked regions: an always-visible title row, a collapsible region holding the description, and an always-visible trailing region with the full-bleed bottom divider. See [`src/header/README.md`](src/header/README.md) for header blocks (MetaBlock, Badge, InfoBlock) and collapse behavior.

- `title` — required `ReactNode`. Rendered as an `<h3>` carrying a generated id.
- `titleIcon` — EUI icon type rendered after the title. Without `titleTooltip` it is decorative (`aria-hidden`).
- `titleTooltip` — when set, the title icon becomes a focusable `EuiIconTip` using `titleIcon` as its type, defaulting to `info`.
- `description` — arbitrary `ReactNode` rendered below the title in subdued text. Not wrapped in a `<p>`, so block content is valid.
- `collapsed` — renders the compact layout permanently, regardless of scroll position.
- `children` — `Header.MetaBlock`, `Header.Badge`, and `Header.InfoBlock` parts. Free-form content (arbitrary elements, components, bare text) is not rendered, and the assembly library warns in development about unrecognized children.

**`FlyoutTemplate.Body`** renders `Body.TabPanel` parts plus arbitrary passthrough content inside `EuiFlyoutBody` in source order. Passthrough children manage their own layout; the template adds no sectioning, titling, or dividers around them. See [Tabs](#tabs) below.

**`FlyoutTemplate.Footer`** renders `PrimaryAction` and `SecondaryAction` right-aligned inside `EuiFlyoutFooter`, secondary first. If neither action is present, the footer is omitted entirely — no default Cancel button is added. Only the first instance of each action is rendered.

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as an `EuiButton`, filled.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.

Both actions take `label`, `onClick`, and optional `id`, `iconType`, `isLoading`, `isDisabled`, `data-test-subj`. The `id` is forwarded to the button element.

## Behavior

- The generated header title id is used for `EuiFlyout`'s `aria-labelledby` only as a fallback: an explicit `aria-labelledby` wins, and an explicit `aria-label` suppresses it. With no labeling props and a header present, the flyout is labeled by the title without a separate `aria-label`.
- A string `title` is forwarded to EUI's flyout menu as the history entry title, and is used as the `aria-label` fallback when the flyout is not labeled by the title id. An explicit `flyoutMenuProps.title` overrides it. A non-string `title` does neither.
- The header's bottom divider bleeds to the flyout edges using the root `paddingSize`; it aligns with the flyout chrome regardless of which padding size is active.
- `FlyoutTemplate.Body` is required. Omitting it logs a dev warning. The header and footer are optional.
- Duplicate zones (e.g. two `FlyoutTemplate.Header` children) log a dev warning and render only the first.
- The zone components (`Header`, `Body`, `Footer`) and the footer action parts render nothing when used outside a `FlyoutTemplate` root.

## Tabs

Pass `tabs` to the root to render a tab bar at the bottom of the header. Each entry takes `id`, `label`, and optional `disabled`, `prepend`, `append`, and `data-test-subj`. Declare a `Body.TabPanel` for each tab id; the template wires the `tab`/`tabpanel` accessibility relationship and mounts only the selected panel.

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

`FlyoutTemplate` discovers its zones by parsing its *direct* JSX children, so every part has to be a literal child of the zone that parses it. `core.overlays.openFlyoutTemplate` takes the template's props and a function returning its zones, and calls that function inside its own render, so the zones land as literal children and every rule documented above still applies.

```tsx
core.overlays.openFlyoutTemplate({ size: 'm', session: 'start' }, (T) => (
  <>
    <T.Header title="Alert details" />
    <T.Body>
      <T.Body.Section title="Summary">
        <AlertSummary alert={alert} />
      </T.Body.Section>
    </T.Body>
  </>
));
```

The callback's first argument is the `FlyoutTemplate` namespace, so declaring zones needs no import from this package. Its second argument is the flyout's `OverlayRef`, so content can close the flyout it lives in. See `@kbn/core-overlays-browser` for the full signature.

**A part written inside another component does not render.** Parts are identified by parsing direct JSX children, so one returned from inside a component sits behind a boundary the parser cannot see through and silently renders nothing. Keep parts in the JSX of the zone that parses them, and put your own components inside those parts.
