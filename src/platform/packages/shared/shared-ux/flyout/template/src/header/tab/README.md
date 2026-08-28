# Tabs

Tabs span two zones: `Header.Tab` declares each tab in the header, and `Body.TabPanel` holds its content in the body. The template renders the tab bar at the bottom of the header, wires the `tab`/`tabpanel` accessibility relationship, and mounts only the selected panel.

```tsx
<FlyoutTemplate onClose={onClose} selectedTabId={tabId} onTabChange={setTabId}>
  <FlyoutTemplate.Header title="Alert details">
    <FlyoutTemplate.Header.Tab id="overview" label="Overview" />
    <FlyoutTemplate.Header.Tab id="metadata" label="Metadata" />
  </FlyoutTemplate.Header>

  <FlyoutTemplate.Body>
    <FlyoutTemplate.Body.TabPanel tabId="overview">
      <p>Overview content</p>
    </FlyoutTemplate.Body.TabPanel>
    <FlyoutTemplate.Body.TabPanel tabId="metadata">
      <p>Metadata content</p>
    </FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

Each `Header.Tab` takes `id`, `label`, and optional `disabled`, `prepend`, and `append`. Selection is uncontrolled by default, starting on the first tab; pass `defaultSelectedTabId` to the root to start elsewhere. For controlled selection pass `selectedTabId` and `onTabChange` on the root — `onTabChange` fires on every tab click either way.

The header alone decides which tabs exist. Declaring every panel up front is the simplest approach, but it is not required: a tab whose panel is absent is still rendered and still selectable, so a consumer driving `selectedTabId` may supply only the panel for the current tab and mount the rest on demand.

```tsx
<FlyoutTemplate onClose={onClose} selectedTabId={tabId} onTabChange={setTabId}>
  <FlyoutTemplate.Header title="Alert details">
    <FlyoutTemplate.Header.Tab id="overview" label="Overview" />
    <FlyoutTemplate.Header.Tab id="metadata" label="Metadata" />
  </FlyoutTemplate.Header>

  <FlyoutTemplate.Body>
    {/* Only the selected panel is supplied; the other tab still renders and stays clickable. */}
    <FlyoutTemplate.Body.TabPanel tabId={tabId}>{panelFor(tabId)}</FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
</FlyoutTemplate>
```

**Behaviors pinned by design:**

- **The tab bar lists every declared `Header.Tab`,** matched or not. A tab whose panel is absent renders normally and stays selectable; selecting it renders an empty body. This is deliberate — a missing panel is indistinguishable from one the consumer has not supplied yet, so it is treated as a pending state rather than an error, and it is never warned about.
- **A `Body.TabPanel` whose `tabId` matches no `Header.Tab` is not rendered** and logs a development warning naming the unmatched ids. Unlike the reverse case this is unambiguous: the header drives the bar, so an unmatched panel can never be reached.
- **Tab bar is suppressed** when no `Body.TabPanel` is declared at all, even if `Header.Tab` parts are present. A flyout with tabs in the header and nothing in the body renders as if there were no tabs. Supply at least the selected panel to keep the bar up.
- **Only the selected panel mounts.** Panel state is discarded on every tab switch. There is no keep-mounted escape hatch. This is a deliberate decision — free to revisit before there are consumers, expensive once there are.
- **Top-level body content is not rendered in tabbed mode.** Once tabbed mode is active, all non-panel children (sections, passthrough content) are ignored. Everything must live inside a panel.
