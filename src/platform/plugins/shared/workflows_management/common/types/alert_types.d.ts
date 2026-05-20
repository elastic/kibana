import type { AlertHit } from '@kbn/alerting-plugin/server/types';
export interface AlertSelection {
    _id: string;
    _index: string;
}
export interface AlertTriggerInput {
    event: {
        alertIds: AlertSelection[];
        triggerType: 'alert';
    };
}
export interface AlertEventRule {
    id: string;
    name: string;
    tags: string[];
    consumer: string;
    producer: string;
    ruleTypeId: string;
}
export interface AlertEvent {
    alerts: AlertHit[];
    rule: AlertEventRule;
    ruleUrl?: string;
    spaceId: string;
}
