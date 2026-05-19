import type { SerializableRecord } from '@kbn/utility-types';
export declare const ruleDetailsLocatorID = "RULE_DETAILS_LOCATOR";
export declare const rulesLocatorID = "RULES_LOCATOR";
export type RuleDetailsTabId = 'alerts' | 'history';
export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';
export declare const RULE_DETAILS_ALERTS_TAB: RuleDetailsTabId;
export declare const RULE_DETAILS_HISTORY_TAB: RuleDetailsTabId;
export interface RuleDetailsLocatorParams extends SerializableRecord {
    ruleId: string;
    tabId?: RuleDetailsTabId;
    rangeFrom?: string;
    rangeTo?: string;
    kuery?: string;
    controlConfigs?: SerializableRecord[];
}
export interface RulesLocatorParams extends SerializableRecord {
    lastResponse?: string[];
    params?: Record<string, string | number>;
    search?: string;
    status?: RuleStatus[];
    type?: string[];
}
