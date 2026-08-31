# Trace Waterfall Components

This directory contains two components for rendering APM trace waterfalls:

- **`TraceWaterfallWithFetching`** — fetches trace data from the APM API and renders the waterfall
- **`TraceWaterfall`** — pure rendering component; you supply pre-fetched `TraceItem[]` data

## Which one should I use?

| Scenario                                 | Component                                         |
| ---------------------------------------- | ------------------------------------------------- |
| Rendering a trace by ID with no data yet | `TraceWaterfallWithFetching`                      |
| You already have `TraceItem[]` data      | `TraceWaterfall`                                  |
| Consuming from another Kibana plugin     | Use the pre-bound wrappers from `@kbn/apm-shared` |

---

## `TraceWaterfallWithFetching`

Fetches trace data from `GET /internal/apm/unified_traces/{traceId}` and renders `TraceWaterfall` with the result.

### Props

```typescript
type Props = FullTraceWaterfallProps & {
  core: CoreStart;
  callApmApi: APMClientV2;
};
```

| Prop                     | Type                                | Required | Description                                                                    |
| ------------------------ | ----------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `core`                   | `CoreStart`                         | Yes      | Kibana core services                                                           |
| `callApmApi`             | `APMClientV2`                       | Yes      | APM API client (from `@kbn/apm-api-shared`)                                    |
| `traceId`                | `string`                            | Yes      | Trace ID to fetch and render                                                   |
| `rangeFrom`              | `string`                            | Yes      | Start of time range (ISO string or date math, e.g. `now-15m`)                  |
| `rangeTo`                | `string`                            | Yes      | End of time range (ISO string or date math, e.g. `now`)                        |
| `ebt`                    | `{ row, errorBadge, serviceBadge }` | Yes      | Event-based telemetry context (see [EBT](#ebt-event-based-telemetry))          |
| `serviceName`            | `string`                            | No       | Service name used in the legend                                                |
| `scrollElement`          | `Element`                           | No       | Custom scroll container                                                        |
| `onNodeClick`            | `(spanId: string) => void`          | No       | Called when a span row is clicked                                              |
| `onErrorClick`           | `FullTraceWaterfallOnErrorClick`    | No       | Called when an error badge is clicked                                          |
| `contextSpanIds`         | `string[]`                          | No       | Span IDs to highlight and auto-expand                                          |
| `scrollStrategy`         | `'window' \| 'parent'`              | No       | See [Scroll strategy](#scroll-strategy)                                        |
| `scrollToContextOnMount` | `boolean`                           | No       | Auto-scroll to `contextSpanIds` on mount (requires `scrollStrategy: 'parent'`) |

### Example

```tsx
import { TraceWaterfallWithFetching, TRACE_WATERFALL_EBT_ELEMENTS } from '@kbn/apm-ui-shared';

<TraceWaterfallWithFetching
  core={core}
  callApmApi={callApmApi}
  traceId="abc123"
  rangeFrom="2024-01-01T00:00:00.000Z"
  rangeTo="2024-01-01T01:00:00.000Z"
  ebt={{
    row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
    errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
    serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
  }}
  onNodeClick={(spanId) => console.log('clicked span', spanId)}
/>;
```

If your plugin uses `@kbn/apm-shared`, `core` and `callApmApi` are pre-bound:

```tsx
const { TraceWaterfallWithFetching } = pluginsStart.apmShared;

<TraceWaterfallWithFetching
  traceId="abc123"
  rangeFrom="2024-01-01T00:00:00.000Z"
  rangeTo="2024-01-01T01:00:00.000Z"
  ebt={{
    row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
    errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
    serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
  }}
/>;
```

---

## `TraceWaterfall`

Pure rendering component. Requires pre-fetched `TraceItem[]` data. Use this when you already have trace data or want full control over fetching.

### Props

```typescript
type TraceWaterfallProps = {
  traceItems: TraceItem[];
  errors?: Error[];
  agentMarks?: Record<string, number>;
  traceDocsTotal?: number;
  maxTraceItems?: number;
  entryTransactionId?: string;
  serviceName?: string;
  isFiltered?: boolean;
  showAccordion?: boolean;
  showLegend?: boolean;
  isEmbeddable?: boolean;
  showCriticalPathControl?: boolean;
  showCriticalPath?: boolean;
  defaultShowCriticalPath?: boolean;
  onShowCriticalPathChange?: (value: boolean) => void;
  onClick?: (id: string, options?: { flyoutDetailTab?: string }) => void;
  onErrorClick?: OnErrorClick;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
  getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
  discoverHref?: string;
  children?: React.ReactNode;
  ebt?: {
    row: { element: string };
    errorBadge: { element: string };
    serviceBadge: { element: string };
  };
} & (
  | { scrollStrategy?: 'window'; contextSpanIds?: string[] }
  | { scrollStrategy: 'parent'; contextSpanIds?: string[]; scrollToContextOnMount?: boolean }
);
```

| Prop                       | Type                       | Required | Description                                                                       |
| -------------------------- | -------------------------- | -------- | --------------------------------------------------------------------------------- |
| `traceItems`               | `TraceItem[]`              | Yes      | Pre-fetched span/transaction items                                                |
| `errors`                   | `Error[]`                  | No       | Errors associated with the trace                                                  |
| `agentMarks`               | `Record<string, number>`   | No       | Agent instrumentation timing marks                                                |
| `traceDocsTotal`           | `number`                   | No       | Total trace docs in Elasticsearch (shows truncation warning if `> maxTraceItems`) |
| `maxTraceItems`            | `number`                   | No       | Threshold for truncation warning                                                  |
| `entryTransactionId`       | `string`                   | No       | ID of the entry transaction (used as root)                                        |
| `serviceName`              | `string`                   | No       | Service name for legend display                                                   |
| `isFiltered`               | `boolean`                  | No       | Whether trace items have been filtered                                            |
| `showAccordion`            | `boolean`                  | No       | Show expand/collapse controls (default: `true`)                                   |
| `showLegend`               | `boolean`                  | No       | Show color legend (default: `false`)                                              |
| `isEmbeddable`             | `boolean`                  | No       | Reduces chrome for embedded contexts (default: `false`)                           |
| `showCriticalPathControl`  | `boolean`                  | No       | Show critical path toggle button                                                  |
| `showCriticalPath`         | `boolean`                  | No       | Controlled critical path visibility                                               |
| `defaultShowCriticalPath`  | `boolean`                  | No       | Uncontrolled default critical path visibility                                     |
| `onShowCriticalPathChange` | `(value: boolean) => void` | No       | Fires when critical path toggle changes                                           |
| `onClick`                  | `OnNodeClick`              | No       | Called when a span row is clicked                                                 |
| `onErrorClick`             | `OnErrorClick`             | No       | Called when an error badge is clicked                                             |
| `scrollElement`            | `Element`                  | No       | Custom scroll container                                                           |
| `getRelatedErrorsHref`     | function                   | No       | Returns href for related errors link                                              |
| `getServiceBadgeHref`      | function                   | No       | Returns href for service badge link                                               |
| `discoverHref`             | `string`                   | No       | Link to Discover for full trace view                                              |
| `children`                 | `ReactNode`                | No       | Extra content rendered below the waterfall                                        |
| `ebt`                      | object                     | No       | EBT telemetry context                                                             |
| `contextSpanIds`           | `string[]`                 | No       | Span IDs to highlight and auto-expand                                             |
| `scrollStrategy`           | `'window' \| 'parent'`     | No       | See [Scroll strategy](#scroll-strategy)                                           |
| `scrollToContextOnMount`   | `boolean`                  | No       | Auto-scroll to context on mount (`scrollStrategy: 'parent'` only)                 |

### Example

```tsx
import { TraceWaterfall, TRACE_WATERFALL_EBT_ELEMENTS } from '@kbn/apm-ui-shared';

<TraceWaterfall
  traceItems={traceItems}
  errors={errors}
  showLegend
  showCriticalPathControl
  entryTransactionId={rootTransactionId}
  onClick={(spanId) => openFlyout(spanId)}
  onErrorClick={({ docId, errorCount }) => openErrorFlyout(docId, errorCount)}
  ebt={{
    row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
    errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
    serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
  }}
/>;
```

---

## Scroll strategy

Controls how the waterfall handles scrolling.

### `'window'` (default)

Scrolls with the page. Use this for full-page views.

```tsx
<TraceWaterfallWithFetching
  traceId={traceId}
  rangeFrom={rangeFrom}
  rangeTo={rangeTo}
  ebt={ebt}
  // scrollStrategy="window" is implicit
/>
```

### `'parent'`

Scrolls within a custom container. Use this inside flyouts, panels, or modals where the page does not scroll.

```tsx
const [scrollContainer, setScrollContainer] = useState<Element | null>(null);

<div ref={(el) => setScrollContainer(el)} style={{ overflow: 'auto', height: 600 }}>
  {scrollContainer && (
    <TraceWaterfallWithFetching
      traceId={traceId}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      ebt={ebt}
      scrollStrategy="parent"
      scrollElement={scrollContainer}
      contextSpanIds={[highlightedSpanId]}
      scrollToContextOnMount
    />
  )}
</div>;
```

---

## EBT (Event-Based Telemetry)

The `ebt` prop provides context strings that identify where the waterfall is rendered. These strings are attached to click events and sent to the telemetry pipeline.

Use the exported `TRACE_WATERFALL_EBT_ELEMENTS` constants to pick the right values:

```typescript
import { TRACE_WATERFALL_EBT_ELEMENTS } from '@kbn/apm-ui-shared';

// For a waterfall embedded in the main APM view:
const ebt = {
  row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
  errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
  serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
};

// For a waterfall inside a flyout:
const ebt = {
  row: { element: TRACE_WATERFALL_EBT_ELEMENTS.FLYOUT_WATERFALL_ROW },
  errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.FLYOUT_WATERFALL_ERROR_BADGE },
  serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.FLYOUT_WATERFALL_SERVICE_BADGE },
};
```

Available constants:

| Constant                         | Value                           | Use when                             |
| -------------------------------- | ------------------------------- | ------------------------------------ |
| `WATERFALL_ROW`                  | `'waterfallRow'`                | Row in a main page waterfall         |
| `WATERFALL_ERROR_BADGE`          | `'waterfallErrorBadge'`         | Error badge in main page waterfall   |
| `WATERFALL_SERVICE_BADGE`        | `'waterfallServiceBadge'`       | Service badge in main page waterfall |
| `FLYOUT_WATERFALL_ROW`           | `'flyoutWaterfallRow'`          | Row in a flyout waterfall            |
| `FLYOUT_WATERFALL_ERROR_BADGE`   | `'flyoutWaterfallErrorBadge'`   | Error badge in flyout waterfall      |
| `FLYOUT_WATERFALL_SERVICE_BADGE` | `'flyoutWaterfallServiceBadge'` | Service badge in flyout waterfall    |

---

## `onErrorClick` signature

```typescript
type FullTraceWaterfallOnErrorClick = (params: {
  traceId: string;
  docId: string;
  errorCount: number;
  errorDocId?: string;
  docIndex?: string;
}) => void;
```

Typical pattern — open a detail flyout for a single error, or open a multi-error list:

```tsx
const onErrorClick: FullTraceWaterfallOnErrorClick = ({
  docId,
  errorCount,
  errorDocId,
  docIndex,
}) => {
  if (errorCount > 1) {
    openErrorListFlyout(docId);
  } else if (errorDocId) {
    openErrorDetailFlyout(errorDocId, docIndex);
  }
};
```

---

## Exports

```typescript
// Components
export { TraceWaterfall, type TraceWaterfallProps } from '@kbn/apm-ui-shared';
export { TraceWaterfallWithFetching } from '@kbn/apm-ui-shared';

// EBT constants
export {
  TRACE_WATERFALL_EBT_ELEMENTS,
  TRACE_WATERFALL_EBT_CLICK_ACTIONS,
} from '@kbn/apm-ui-shared';

// Types
export type { OnErrorClick } from '@kbn/apm-ui-shared';

// Utilities
export {
  getTraceParentChildrenMap,
  getRootItemOrFallback,
  getSubtreeIds,
} from '@kbn/apm-ui-shared';
export { useTraceWaterfallContext } from '@kbn/apm-ui-shared';
export { useGetServiceBadgeHrefFromCore } from '@kbn/apm-ui-shared';
```
