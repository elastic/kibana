# @kbn/entity-centric-lab-flyout

Shared, mock-data-driven entity-centric lab flyout used by Discover and the
Streams app. Renders a six-tab flyout (Overview, Metrics, Logs, Alerts,
Relationships, Security) for a given entity name.

This is a lab feature — all data is synthesised client-side via
`buildFakeEntityOverview` / `buildFakeEntityTabsData`. Wiring to real Kibana
signals lives outside this package.

## Usage

```tsx
import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
} from '@kbn/entity-centric-lab-flyout';

<EntityFlyoutServicesProvider
  services={{ agentBuilder, notifications, charts }}
>
  <EntityFlyout entityName="checkout" onClose={() => setOpen(false)} />
</EntityFlyoutServicesProvider>;
```

`agentBuilder` is optional — when omitted, the "Add to chat" button is
hidden.
