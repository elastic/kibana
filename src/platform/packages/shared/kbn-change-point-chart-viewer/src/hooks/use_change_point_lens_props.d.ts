import type { LensAttributes, LensXYConfig } from '@kbn/lens-embeddable-utils/config_builder';
import type { EmbeddableComponentProps } from '@kbn/lens-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { UnifiedChangePointGridProps } from '../types';
export type ChangePointLensProps = Pick<EmbeddableComponentProps, 'id' | 'viewMode' | 'timeRange' | 'attributes' | 'esqlVariables' | 'noPadding' | 'searchSessionId' | 'executionContext' | 'onLoad' | 'lastReloadRequestTime' | 'userMessages'>;
/**
 * Builds and keeps the Lens embeddable props up-to-date for a single change point chart card.
 *
 * Returns `undefined` while the first build is in flight (renders a loading state).
 *
 * Two independent signals trigger a rebuild:
 *  - `chartConfigUpdates$` — fires whenever the card's ES|QL query, title, layers, description,
 *    or error change (i.e. any input that affects the compiled Lens attributes).
 *  - `discoverFetch$` — fires whenever Discover triggers a new search (time range, filters, etc.).
 *    This observable must be a **stable reference**: a new identity on each render restarts the
 *    RxJS subscription, which immediately triggers a rebuild loop via the BehaviorSubject.
 *
 * Builds are skipped while the chart is not visible in the viewport and resume automatically once
 * it scrolls into view (IntersectionObserver, 10% threshold). This avoids building Lens
 * expressions for the many off-screen cards in a paginated grid.
 *
 * `switchMap` ensures only the latest build is ever applied: if a new trigger arrives while
 * `builder.build()` is still awaiting, the in-flight result is discarded.
 */
export declare const useChangePointLensProps: ({ lensInstanceId, title, query, services, fetchParams, discoverFetch$, chartRef, chartLayers, timeRange: timeRangeOverride, error, userMessages, description, }: {
    lensInstanceId: string;
    /** Human-readable label shown in the Lens panel header, e.g. `"web-server-1"`. */
    title: string;
    /** The ES|QL query driving this chart (the entity-filtered line-data sub-query). */
    query: string;
    /**
     * Emits whenever Discover executes a new search (time range change, filter change, etc.).
     *
     * **Must be a stable reference** (e.g. created once outside the render function). A new
     * reference on every render restarts the RxJS subscription on each re-render, which triggers
     * an immediate BehaviorSubject emission → rebuild → `setLensPropsContext` → re-render loop.
     */
    discoverFetch$: UnifiedChangePointGridProps["fetch$"];
    /** Ref to the chart's wrapper element used for viewport visibility detection. When omitted (e.g. in tests), builds run unconditionally. */
    chartRef?: React.RefObject<HTMLDivElement>;
    /** Lens XY layer config: one series layer plus an optional annotation layer. */
    chartLayers: LensXYConfig["layers"];
    /** Overrides the Discover global time range, e.g. to include annotation timestamps that fall before the range start. */
    timeRange?: TimeRange;
    /** When set, renders an error overlay via Lens `userMessages` instead of the chart. */
    error?: Error;
    userMessages?: EmbeddableComponentProps["userMessages"];
    /** Optional Lens panel description (e.g. entity identity). Forwarded to `LensAttributes.description` for use as case-attachment metadata. */
    description?: string;
} & Pick<UnifiedChangePointGridProps, "services" | "fetchParams">) => {
    lensProps: ChangePointLensProps | undefined;
    buildError: Error | undefined;
};
export declare const getChangePointLensProps: ({ id, searchSessionId, timeRange, attributes, lastReloadRequestTime, esqlVariables, userMessages, }: {
    id: string;
    searchSessionId?: string;
    attributes: LensAttributes;
    esqlVariables: ESQLControlVariable[] | undefined;
    timeRange: TimeRange;
    lastReloadRequestTime?: number;
    userMessages?: EmbeddableComponentProps["userMessages"];
}) => ChangePointLensProps;
