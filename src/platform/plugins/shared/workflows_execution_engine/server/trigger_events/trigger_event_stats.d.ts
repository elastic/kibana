/** Counts along the subscription -> match funnel for one emit. */
export interface TriggerResolutionStats {
    subscribedCount: number;
    disabledCount: number;
    kqlFalseCount: number;
    kqlErrorCount: number;
    matchedCount: number;
}
/** Scheduling outcomes after KQL-matched workflows are considered. */
export interface TriggerEventScheduleStats {
    depthSkippedCount: number;
    /** Matched workflows skipped because `on.workflowEvents: ignore` and the emit was workflow-attributed. */
    workflowEventsIgnoreSkippedCount: number;
    /** Matched workflows skipped by the event-chain cycle guard (typically `on.workflowEvents: avoid-loop` or omitted). */
    workflowEventsCycleSkippedCount: number;
    scheduledAttemptCount: number;
    scheduledSuccessCount: number;
    scheduledFailureCount: number;
}
export declare const createEmptyTriggerResolutionStats: () => TriggerResolutionStats;
export declare const createEmptyTriggerScheduleStats: () => TriggerEventScheduleStats;
