# Focused Trace Waterfall Components

This directory contains two components for rendering a **contextual subset** of an APM trace centred around a specific document:

- **`FocusedTraceWaterfallWithFetching`** — fetches focused trace data from the APM API and renders the waterfall
- **`FocusedTraceWaterfall`** — pure rendering component; you supply the pre-fetched `FocusedTrace` data

## What "focused" means

Unlike the full `TraceWaterfall` which renders the entire trace tree, the focused variant displays only the nodes that matter for understanding a specific document:

```
Root Transaction
  └─ Parent Span  (only shown when different from root)
       └─ [FOCUSED DOCUMENT]  ← highlighted
            ├─ Child Span A
            └─ Child Span B
                 └─ Grandchild Span
```

Siblings and unrelated ancestors are omitted. This makes it suitable for contexts where the user has already selected a specific span or transaction and wants to see where it fits in its trace — for example in the unified doc viewer.

---

## Which one should I use?

| Scenario                               | Component                                        |
| -------------------------------------- | ------------------------------------------------ |
| Rendering by trace ID with no data yet | `FocusedTraceWaterfallWithFetching`              |
| You already have `FocusedTrace` data   | `FocusedTraceWaterfall`                          |
| Consuming from another Kibana plugin   | Use the pre-bound wrapper from `@kbn/apm-shared` |

---

## `FocusedTraceWaterfallWithFetching`

Calls `GET /internal/apm/unified_traces/{traceId}/summary`, then renders `FocusedTraceWaterfall` with the result. Shows a loading spinner while fetching.

### Props

```typescript
type Props = {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  docId?: string;
  core: CoreStart;
  callApmApi: APMClientV2;
};
```

| Prop         | Type          | Required | Description                                                                                                                                                                             |
| ------------ | ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `traceId`    | `string`      | Yes      | Trace ID to fetch                                                                                                                                                                       |
| `rangeFrom`  | `string`      | Yes      | Start of time range (ISO 8601 or date math, e.g. `now-15m`)                                                                                                                             |
| `rangeTo`    | `string`      | Yes      | End of time range                                                                                                                                                                       |
| `docId`      | `string`      | No       | Document ID to focus on. When provided the API returns only that document plus its root, parent, and descendants. When omitted the API returns the root transaction as the focus point. |
| `core`       | `CoreStart`   | Yes      | Kibana core services (used to build service badge hrefs)                                                                                                                                |
| `callApmApi` | `APMClientV2` | Yes      | APM API client (from `@kbn/apm-api-shared`)                                                                                                                                             |

### Example

```tsx
import { FocusedTraceWaterfallWithFetching } from '@kbn/apm-ui-shared';

<FocusedTraceWaterfallWithFetching
  core={core}
  callApmApi={callApmApi}
  traceId="abc123"
  rangeFrom="2024-01-01T00:00:00.000Z"
  rangeTo="2024-01-01T01:00:00.000Z"
  docId={selectedSpanId}
/>;
```

If your plugin uses `@kbn/apm-shared`, `core` and `callApmApi` are pre-bound:

```tsx
const { FocusedTraceWaterfallWithFetching } = pluginsStart.apmShared;

<FocusedTraceWaterfallWithFetching
  traceId="abc123"
  rangeFrom="2024-01-01T00:00:00.000Z"
  rangeTo="2024-01-01T01:00:00.000Z"
  docId={selectedSpanId}
/>;
```

---

## `FocusedTraceWaterfall`

Pure rendering component. Use this when you already have data from the API or want to control fetching yourself.

### Props

```typescript
type Props = {
  items: FocusedTrace;
  isEmbeddable?: boolean;
  onErrorClick?: (params: { traceId: string; docId: string }) => void;
  getServiceBadgeHref?: WaterfallGetServiceBadgeHref;
};

// FocusedTrace is the full response from GET /internal/apm/unified_traces/{traceId}/summary
type FocusedTrace = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>;
```

| Prop                  | Type                                   | Required | Description                               |
| --------------------- | -------------------------------------- | -------- | ----------------------------------------- |
| `items`               | `FocusedTrace`                         | Yes      | Full API response (trace items + summary) |
| `isEmbeddable`        | `boolean`                              | No       | Reduces chrome for embedded contexts      |
| `onErrorClick`        | `(params: { traceId, docId }) => void` | No       | Called when an error badge is clicked     |
| `getServiceBadgeHref` | `WaterfallGetServiceBadgeHref`         | No       | Returns href for service badge links      |

### Example

```tsx
import { FocusedTraceWaterfall } from '@kbn/apm-ui-shared';

<FocusedTraceWaterfall
  items={focusedTraceData}
  isEmbeddable
  onErrorClick={({ traceId, docId }) => openErrorFlyout(traceId, docId)}
/>;
```

---

## API endpoint

Both components ultimately depend on:

```
GET /internal/apm/unified_traces/{traceId}/summary
```

**Query parameters:**

| Parameter | Type                | Description                         |
| --------- | ------------------- | ----------------------------------- |
| `start`   | `string`            | ISO 8601 start time (`rangeFrom`)   |
| `end`     | `string`            | ISO 8601 end time (`rangeTo`)       |
| `docId`   | `string` (optional) | Focus the response on this document |

**Response shape:**

```typescript
{
  traceItems?: {
    rootDoc: TraceItem;           // Absolute root of the trace
    parentDoc?: TraceItem;        // Direct parent of docId (omitted if parent is root)
    focusedTraceDoc: TraceItem;   // The document identified by docId
    focusedTraceTree: TraceItemChild[];  // Recursive children of focusedTraceDoc
  };
  summary: {
    services: number;     // Unique services involved
    traceEvents: number;  // Total spans + transactions
    errors: number;       // Error count
  };
}
```

---

## Relation to `TraceWaterfall`

`FocusedTraceWaterfall` wraps the full `TraceWaterfall` component internally with these fixed settings:

- **`showAccordion={false}`** — no expand/collapse controls (simpler presentation)
- **`contextSpanIds={[focusedTraceDoc.id]}`** — highlights and auto-expands the focused document
- No `showLegend`, `showCriticalPathControl`, or `ebt` (not needed for focused view)

It also renders a `TraceSummary` bar below the waterfall showing service count, trace event count, and error count from the API response summary.

---

## `docId` behaviour

| `docId`                  | What the API returns                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Omitted                  | The root transaction is used as the focus point. Shows the entry transaction and its full subtree.                    |
| Provided (root doc ID)   | Same as omitting it — root is already the focus.                                                                      |
| Provided (child span ID) | Root transaction → parent span (if not root) → focused span → focused span's descendants only. Siblings are excluded. |

---

## Exported utilities

```typescript
// Flattens the nested TraceItemChild tree into a flat TraceItem[]
export function flattenChildren(
  children: FocusedTrace['traceItems']['focusedTraceTree']
): TraceItem[];

// Re-parents the focused document to root for correct waterfall display
export function reparentDocumentToRoot(
  items: FocusedTrace['traceItems']
): FocusedTraceItems | undefined;
```

---

## Exports

```typescript
// Components
export { FocusedTraceWaterfall } from '@kbn/apm-ui-shared';
export { FocusedTraceWaterfallWithFetching } from '@kbn/apm-ui-shared';
```
