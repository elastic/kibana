import type { SerializableRecord } from '@kbn/utility-types';
export declare const ruleDetailsLocatorID = "RULE_DETAILS_LOCATOR";
export declare const rulesLocatorID = "RULES_LOCATOR";
export type RuleDetailsTabId = 'alerts' | 'history';
export type RuleStatus = 'enabled' | 'disabled' | 'snoozed';
export declare const RULE_DETAILS_ALERTS_TAB: RuleDetailsTabId;
export declare const RULE_DETAILS_HISTORY_TAB: RuleDetailsTabId;
/**
 * Identifies the Kibana app and in-app path prefix so the same locator
 * resolves to different URL trees depending on which app mounts the page
 * (Stack Management, Observability, etc.).
 *
 * `pathPrefix` is an in-app path, not `core.http.basePath`.
 */
export interface LocatorHost extends SerializableRecord {
    app: string;
    pathPrefix: string;
    /** Full URL base for the app (e.g. `/app/observability/alerting`). Falls back to `/app/${app}` when omitted; set this when the app registers a custom `appRoute`. */
    appBasePath?: string;
}
export declare const STACK_MANAGEMENT_RULES_HOST: LocatorHost;
export interface RuleDetailsLocatorParams extends SerializableRecord {
    ruleId: string;
    tabId?: RuleDetailsTabId;
    rangeFrom?: string;
    rangeTo?: string;
    kuery?: string;
    controlConfigs?: SerializableRecord[];
    host?: LocatorHost;
}
export interface RulesLocatorParams extends SerializableRecord {
    lastResponse?: string[];
    params?: Record<string, string | number>;
    search?: string;
    status?: RuleStatus[];
    type?: string[];
    host?: LocatorHost;
}
