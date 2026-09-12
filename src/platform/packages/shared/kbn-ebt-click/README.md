# `@kbn/ebt-click`

Shared utilities and constants for instrumenting click events in Kibana using Event-Based Telemetry (EBT). Click events are reported to the `ebt-kibana-browser` index; clicks carrying `data-ebt-action` are also indexed into `ebt-kibana-browser-click-with-action` as structured, queryable fields.

For instrumentation guidelines, naming conventions, and patterns: `elastic/observability-dev: docs/obs-exploration/telemetry/ebt/ebt-click-tracking-guidelines.md`

## How click tracking works

[`track_clicks.ts`](../../core/packages/analytics/browser-internal/src/track_clicks.ts) listens for all `click` events on `window` in the bubble phase. When a click fires, it walks the DOM from the clicked element up to the root and collects every element's attributes into the `target` array of a `click` EBT event.

Because it collects attributes from the entire ancestor chain, `data-ebt-*` attributes can be placed on the clicked element itself **or on any of its ancestors**.

**Critical:** `stopPropagation()` anywhere between the clicked element and `window` silently kills the event before it reaches the listener. See the guidelines for how to handle this.

## Usage

```tsx
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';

<EuiButton
  {...getEbtProps({
    action: EBT_CLICK_ACTIONS.VIEW_SPAN,
    element: 'waterfallRow',
  })}
>
  View span
</EuiButton>
```

## Exports

### `getEbtProps(ebt: EbtClickAttrs)`

Maps an `EbtClickAttrs` object to the corresponding `data-ebt-*` HTML attributes:

| Field     | HTML attribute      | EBT field         |
|-----------|---------------------|-------------------|
| `action`  | `data-ebt-action`   | `click.action`    |
| `element` | `data-ebt-element`  | `click.element`   |
| `detail`  | `data-ebt-detail`   | `click.detail`    |

### `EbtClickAttrs`

```ts
interface EbtClickAttrs {
  action: string;   // what the user intends to do
  element: string;  // where they clicked
  detail?: string;  // optional extra context
}
```

### `EBT_CLICK_ACTIONS`

Shared action constants for intents that are generic enough to apply across plugins:

```ts
EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER  // 'openInDiscover'
EBT_CLICK_ACTIONS.VIEW_SPAN         // 'viewSpan'
EBT_CLICK_ACTIONS.VIEW_SERVICE      // 'viewService'
EBT_CLICK_ACTIONS.VIEW_ERROR        // 'viewError'
EBT_CLICK_ACTIONS.OPEN_IN_APM      // 'openInApm'
```

For plugin-specific actions, define them locally in the plugin's own `ebt_constants.ts`. For example, see [`apm/public/components/app/ebt_constants.ts`](../../../../solutions/observability/plugins/apm/public/components/app/ebt_constants.ts).

## See also

- [EBT overview](https://docs.elastic.dev/telemetry/telemetry)