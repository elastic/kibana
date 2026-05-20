import { type WorkflowTrigger } from '../../common/lib/trigger_types';
export type { WorkflowTrigger } from '../../common/lib/trigger_types';
export { parseIntervalString } from '../../common/lib/trigger_types';
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
