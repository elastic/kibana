import type { CombinedSummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import type { AlertEvent, AlertEventRule } from '../types/alert_types';
/**
 * Builds the alert event structure used in workflow execution.
 * This function creates the standardized event format that contains
 * alerts, rule information, and context.
 */
export declare function buildAlertEvent(params: {
    alerts: CombinedSummarizedAlerts;
    rule: AlertEventRule;
    ruleUrl?: string;
    spaceId: string;
}): AlertEvent;
