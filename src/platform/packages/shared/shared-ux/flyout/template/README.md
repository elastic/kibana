# @kbn/flyout-template

A layout for Kibana flyouts. You declare a header, a body, and a footer, and the template assembles them into an `EuiFlyout` with consistent spacing.

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

## How it works

The root takes up to three zones as children: `FlyoutTemplate.Header`, `FlyoutTemplate.Body`, and `FlyoutTemplate.Footer`. Each zone takes declarative parts, such as `Header.Badge`, `Body.Section`, or `Footer.PrimaryAction`. The template lays out these parts and supplies the spacing, headings, and dividers.

- `FlyoutTemplate.Body` is required. Leaving it out logs a dev warning. The header and footer are optional.
- If a zone appears twice (e.g. two `FlyoutTemplate.Header` children), only the first renders, and a dev warning is logged.
- The zone components (`Header`, `Body`, `Footer`) and the footer action parts (`PrimaryAction`, `SecondaryAction`, `PrimaryActionMenu`) render nothing outside a `FlyoutTemplate` root.
- **A part returned from another component does not render.** The template finds parts by reading its direct JSX children, and it cannot see inside your components. A part returned from one silently renders nothing. Write parts directly in the zone's JSX, and put your own components inside the parts.

## Root props

The root accepts every `EuiFlyoutProps` prop and any `data-*` attributes, with four exceptions:

- `children` holds the zones.
- `flyoutMenuDisplayMode` is always `auto`.
- `paddingSize` is always `m` (16px), and the footer pads evenly on every side.
- `ref` is not forwarded.

`size` defaults to `m`, and `session` defaults to `start`.

The root also takes the tab props: `tabs`, `tabBarProps`, `selectedTabId`, `defaultSelectedTabId`, and `onTabChange`. See [Tabs](#tabs).

### Labeling and the flyout menu title

- By default, the flyout is labeled by the header title: the title's generated id becomes `EuiFlyout`'s `aria-labelledby`. An explicit `aria-labelledby` replaces it, and an explicit `aria-label` turns it off.
- A string header `title` also becomes the `title` of the flyout's history entry in EUI's flyout menu, merged into `flyoutMenuProps`. An explicit `flyoutMenuProps.title` overrides it. When the flyout is not labeled by the title id, the string title becomes the `aria-label` instead.
- A non-string `title`, such as a link, is not used for the history entry or the `aria-label`. Pass the plain text as `flyoutMenuProps.title`. Otherwise, a managed flyout (the default `session`) shows EUI's default title in the history and warns in development.

## Zones

- **[Header](src/header/README.md)** — the title row with an optional icon, tooltip, and description; meta blocks, badges, and info blocks; and collapse on scroll.
- **[Body](src/body/README.md)** — callouts in the body's banner, sections and accordions, and unstructured content, in source order.
- **[Footer](src/footer/README.md)** — a primary and a secondary action, or a primary action menu.

## Tabs

Pass `tabs` to the root to render a tab bar at the bottom of the header. Each entry takes an `id` and a `label`. The `id` matches the tab to its `Body.TabPanel`. It is not the tab's DOM id, which is generated.

An entry also accepts any `data-*` attributes and the rest of `EuiTabProps`, such as `disabled`, `prepend`, `append`, `className`, `css`, `aria-label`, and `data-test-subj`. The template sets `aria-controls`, `children`, `isSelected`, and `onClick`, so an entry cannot. Selection comes from the root, and clicks go through `onTabChange`. A tab only selects its `Body.TabPanel`, so it takes no `href`.

Pass `tabBarProps` to the root to give the tab bar an `aria-label` and a `data-test-subj`. Declare a `Body.TabPanel` for each tab id. The template connects each tab to its panel for accessibility (`tab` and `tabpanel` roles) and mounts only the selected panel.

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

By default, selection is uncontrolled and starts on the first tab. Pass `defaultSelectedTabId` to start on a different tab. For controlled selection, pass `selectedTabId` and `onTabChange`. `onTabChange` fires on every tab click in both modes.

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

- A non-empty `tabs` array turns on tabbed mode. The tab bar renders and only the selected panel mounts. Apart from `Body.Callout`, anything else directly under `Body`, including sections, is ignored.
- A tab without a panel still renders and can be selected. The body is empty while it is selected. This is how on-demand mounting works, so nothing warns about it.
- Without `tabs`, or with an empty array, tabbed mode is off. Any `Body.TabPanel` is silently ignored, and only the other `Body` content renders.
- Only the selected panel is mounted, so switching tabs discards the panel's state. There is no option to keep panels mounted.
- If two entries in `tabs` share an id, the first one is used and the rest are silently dropped.
- Setting `tabs` without a `<FlyoutTemplate.Header>` logs a dev warning, because the tab bar renders inside the header.

## Test subjects

Each zone's test subject is the root `data-test-subj` plus a zone suffix. A zone's own `data-test-subj` overrides it. Without a root `data-test-subj`, zones have no test subject unless you set one.

| Zone | Default subject | Override prop |
| --- | --- | --- |
| Header | `${root}Header` | `FlyoutTemplate.Header` `data-test-subj` |
| Body | `${root}Body` | `FlyoutTemplate.Body` `data-test-subj` |
| Footer | `${root}Footer` | `FlyoutTemplate.Footer` `data-test-subj` |

Groups inside a zone get the zone's test subject plus another suffix. Without a zone test subject, they use a fixed default.

| Group | Derived subject | Default |
| --- | --- | --- |
| Callout banner | `${body}Banner` | `flyoutBodyBanner` |
| Meta blocks | `${header}MetaBlocks` | `metablocks-container` |
| Info blocks | `${header}InfoBlocks` | `infoBlocks` |
| Tab bar | `${header}Tabs` | none |

The root `tabBarProps` `data-test-subj` overrides the tab bar's derived subject.

Footer action buttons get no derived test subject. Their `data-test-subj` is passed to the button as is.

## Opening a flyout imperatively

`core.overlays.openFlyoutTemplate` takes the template's root props and a component that renders `FlyoutTemplate` with its zones. The component renders the template itself, so the zones are direct children of it, and every rule above still applies.

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

core.overlays.openFlyoutTemplate(
  { size: 'm', session: 'start', flyoutMenuProps: { title: 'Alert details' } },
  AlertDetails
);
```

The component is a real React component, so it can use hooks and re-render. The component receives `onClose` as a prop and passes it to `FlyoutTemplate`. `onClose` is the only root prop the component sets. It stays required so that every `FlyoutTemplate` has a way to close.

Every other root prop comes from `FlyoutTemplateManagedProvider`, which gets them from the options argument and renders the flyout's [frame](#loading-content-in-a-frame). Other root props the component passes to `FlyoutTemplate` are ignored, with a warning in development, except the tab props, which the component's `FlyoutTemplate` sets and the options only default. See `@kbn/core-overlays-browser` for the full signature.

The options must include `flyoutMenuProps.title`. It names the flyout in EUI's flyout menu and history and stays fixed while the flyout is open. The header title of the content is not used for it. Without one, EUI shows its default title, and a warning is logged in development.

You can wrap `onClose`, but not calling it does not keep the flyout open. EUI's flyout manager sends the close button, history navigation, and cascade closes through `onClose`. By the time your handler runs, EUI has already removed the flyout, so the template closes either way. Content nested too deeply to receive the prop can use `useFlyoutClose`.

## Loading content in a frame

Use a frame when a flyout's content loads lazily or goes through a loading state before it is ready. The frame owns the `EuiFlyout` and stays mounted for as long as the flyout is open. Every `FlyoutTemplate` inside it is a declaration: it renders its zones into the frame's flyout, not a flyout of its own. Declarations can come and go, such as a loading one followed by a loaded one, and the flyout keeps its position, its width, and the focus on its own controls.

```tsx
const AlertDetails = React.lazy(() => import('./alert_details'));

<FlyoutTemplate.Frame onClose={onClose} size="m" flyoutMenuProps={{ title: 'Alert details' }}>
  <AlertDetails />
</FlyoutTemplate.Frame>
```

- **Managed flyouts have a frame already.** `core.overlays.openFlyoutTemplate` renders one from its options, so its content component can suspend or swap declarations without any change.
- **Content can suspend.** While it does, the frame shows a loading declaration: a header with the frame's title (`flyoutMenuProps.title`, or `aria-label`) and a loading spinner. With no title, it shows a spinner in the body.
- **The frame takes the flyout's root props**, the ones for `EuiFlyout`, and `FlyoutTemplate.Frame` has no tab props. A declaration takes `children`, the tab props, and `onClose`. Other root props on a declaration are ignored, with a warning in development.
- **Closing.** An unmanaged frame calls its own `onClose`, not the declaration's. A managed frame runs the shown declaration's `onClose`, then closes the flyout.
- **The menu title comes from the frame,** never from a declaration's header. EUI re-registers a managed flyout when its menu title or `size` changes, which closes its history group, so both have to be known when the frame mounts and stay the same.
- **Content that suspends after it has loaded** shows the frame's loading state in its place until it resumes. To keep loaded content on screen, wrap the part that loads later, such as a lazily loaded tab panel, in its own `Suspense`.
- **Labeling.** The frame is labeled by the shown declaration's header title, as a standalone flyout is. A declaration with no header leaves it to the frame's `aria-label` or menu title.
- **A `FlyoutTemplate` inside zone content,** such as a child flyout declared in the body, is not a declaration of the frame. It renders its own flyout.
