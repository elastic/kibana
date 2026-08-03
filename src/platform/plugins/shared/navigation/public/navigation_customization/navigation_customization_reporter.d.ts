import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { NavigationCustomization } from '@kbn/core-chrome-browser';
export interface ReportLoadedDeps {
    analytics: AnalyticsServiceStart;
    /** The platform user signal (e.g. `core.security.authc.getCurrentUser`). */
    getCurrentUser: () => Promise<unknown>;
    /** The customization currently stored for this user/space, if any. */
    savedCustomization: NavigationCustomization | undefined;
}
export interface ReportSaveDeps {
    analytics: AnalyticsServiceStart;
    /** The customization the user just applied. */
    customization: NavigationCustomization;
    /** Visible-item ids in display order. */
    order: string[];
    /** Ids the user hid under "More". */
    hiddenIds: string[];
}
/**
 * Owns the navigation-customization telemetry orchestration: when each event
 * fires and the once-per-lifecycle dedupe state behind it. The wire-format
 * concerns (event names, schema, prop shape) live in `./telemetry`; this class
 * only decides when to emit and derives the payload from data the service hands it.
 */
export declare class NavigationCustomizationReporter {
    /** Guards the per-load event so it fires at most once per lifecycle. */
    private loadedReported;
    /** Whether the active space has resolved to a solution, gating the save event. */
    private solutionResolved;
    /** Records that the active space resolved to a solution, enabling save reporting. */
    markSolutionResolved(): void;
    /**
     * Emits the per-load nav-state event at most once. Gated on the user signal so
     * EBT's context.userId (from the same cached getCurrentUser()) is stamped before
     * we emit, avoiding a null-userId bucket; emitted regardless of resolve/reject so
     * the event is never dropped.
     */
    reportLoadedOnce({ analytics, getCurrentUser, savedCustomization }: ReportLoadedDeps): void;
    /**
     * Emits the save event for a persisted layout. No-op until a solution has
     * resolved, since the event's space breakdown depends on that context.
     */
    reportSave({ analytics, customization, order, hiddenIds }: ReportSaveDeps): void;
}
