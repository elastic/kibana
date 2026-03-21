export interface WorkflowTrigger {
    type: 'alert' | 'scheduled' | 'manual';
    with?: Record<string, any>;
}
/**
 * Parses interval string in format like "5m", "2h", "1d", "30s"
 * @param intervalString - The interval string to parse (e.g., "5m", "2h", "1d")
 * @returns Object with value and unit, or null if invalid
 */
export declare function parseIntervalString(intervalString: string): {
    value: number;
    unit: string;
} | null;
export interface WorkflowRRuleConfig {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    tzid: string;
    dtstart?: string;
    byhour?: number[];
    byminute?: number[];
    byweekday?: string[];
    bymonthday?: number[];
}
/**
 * Converts a workflow scheduled trigger to a task manager schedule format
 */
export declare function convertWorkflowScheduleToTaskSchedule(trigger: WorkflowTrigger): {
    rrule: any;
} | {
    interval: string;
};
/**
 * Checks if a workflow has any scheduled triggers
 */
export declare function hasScheduledTriggers(triggers: WorkflowTrigger[]): boolean;
/**
 * Gets all scheduled triggers from a workflow
 */
export declare function getScheduledTriggers(triggers: WorkflowTrigger[]): WorkflowTrigger[];
/**
 * Converts RRule configuration from YAML to taskmanager format
 */
export declare function convertRRuleToTaskSchedule(rruleConfig: WorkflowRRuleConfig): {
    rrule: any;
};
