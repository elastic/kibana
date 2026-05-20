import type { estypes } from '@elastic/elasticsearch';
import type { EsQueryConfig } from '@kbn/es-query';
export declare const ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID: "attack-discovery";
/**
 * registering a new instance of the rule data client
 * in a new plugin will require updating the below data structure
 * to include the index name where the alerts as data will be written to.
 */
export declare const AlertConsumers: {
    readonly APM: "apm";
    readonly LOGS: "logs";
    readonly INFRASTRUCTURE: "infrastructure";
    readonly OBSERVABILITY: "observability";
    readonly STREAMS: "streams";
    readonly SLO: "slo";
    readonly SIEM: "siem";
    readonly UPTIME: "uptime";
    readonly ML: "ml";
    readonly STACK_ALERTS: "stackAlerts";
    readonly EXAMPLE: "AlertingExample";
    readonly MONITORING: "monitoring";
    readonly ALERTS: "alerts";
    readonly DISCOVER: "discover";
};
export type AlertConsumers = (typeof AlertConsumers)[keyof typeof AlertConsumers];
export declare const DEPRECATED_ALERTING_CONSUMERS: "observability"[];
export type STATUS_VALUES = 'open' | 'acknowledged' | 'closed' | 'in-progress';
export type ValidFeatureId = AlertConsumers;
export declare const validFeatureIds: string[];
export declare const isValidFeatureId: (a: unknown) => a is ValidFeatureId;
/**
 * Prevent javascript from returning Number.MAX_SAFE_INTEGER when Elasticsearch expects
 * Java's Long.MAX_VALUE. This happens when sorting fields by date which are
 * unmapped in the provided index
 *
 * Ref: https://github.com/elastic/elasticsearch/issues/28806#issuecomment-369303620
 *
 * return stringified Long.MAX_VALUE if we receive Number.MAX_SAFE_INTEGER
 * @param sortIds estypes.SortResults | undefined
 * @returns SortResults
 */
export declare const getSafeSortIds: (sortIds: estypes.SortResults | null | undefined) => Array<string | number> | undefined;
interface GetEsQueryConfigParamType {
    allowLeadingWildcards?: EsQueryConfig['allowLeadingWildcards'];
    queryStringOptions?: EsQueryConfig['queryStringOptions'];
    ignoreFilterIfFieldNotInIndex?: EsQueryConfig['ignoreFilterIfFieldNotInIndex'];
    dateFormatTZ?: EsQueryConfig['dateFormatTZ'];
}
export declare const getEsQueryConfig: (params?: GetEsQueryConfigParamType) => EsQueryConfig;
/**
 * TODO: Remove when checks for specific rule type ids is not needed
 *in the codebase.
 */
export declare const isSiemRuleType: (ruleTypeId: string) => boolean;
export {};
