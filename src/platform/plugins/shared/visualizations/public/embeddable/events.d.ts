import { ALERT_RULE_TRIGGER, ON_CLICK_ROW, ON_APPLY_FILTER, ON_SELECT_RANGE, ON_CLICK_VALUE, MULTI_VALUE_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
export interface VisEventToTrigger {
    ['applyFilter']: typeof ON_APPLY_FILTER;
    ['brush']: typeof ON_SELECT_RANGE;
    ['filter']: typeof ON_CLICK_VALUE;
    ['multiFilter']: typeof MULTI_VALUE_CLICK_TRIGGER;
    ['tableRowContextMenuClick']: typeof ON_CLICK_ROW;
    ['alertRule']: typeof ALERT_RULE_TRIGGER;
}
export declare const VIS_EVENT_TO_TRIGGER: VisEventToTrigger;
