export declare const OBSERVABILITY_THRESHOLD_RULE_TYPE_ID = "observability.rules.custom_threshold";
/**
 * APM rule types
 */
export declare enum ApmRuleType {
    ErrorCount = "apm.error_rate",// ErrorRate was renamed to ErrorCount but the key is kept as `error_rate` for backwards-compat.
    TransactionErrorRate = "apm.transaction_error_rate",
    TransactionDuration = "apm.transaction_duration",
    Anomaly = "apm.anomaly"
}
export declare const APM_RULE_TYPE_IDS: ApmRuleType[];
/**
 * Synthetics ryle types
 */
export declare const SYNTHETICS_STATUS_RULE = "xpack.synthetics.alerts.monitorStatus";
export declare const SYNTHETICS_TLS_RULE = "xpack.synthetics.alerts.tls";
export declare const SYNTHETICS_ALERT_RULE_TYPES: {
    MONITOR_STATUS: string;
    TLS: string;
};
export declare const SYNTHETICS_RULE_TYPE_IDS: string[];
/**
 * SLO rule types
 */
export declare const SLO_BURN_RATE_RULE_TYPE_ID = "slo.rules.burnRate";
export declare const SLO_RULE_TYPE_IDS: string[];
/**
 * ESQL rule types
 */
export declare const STREAMS_ESQL_RULE_TYPE_ID = "streams.rules.esql";
export declare const STREAMS_RULE_TYPE_IDS: string[];
/**
 * Metrics rule types
 */
export declare const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = "metrics.alert.inventory.threshold";
export declare const METRIC_THRESHOLD_ALERT_TYPE_ID = "metrics.alert.threshold";
/**
 * Logs rule types
 */
export declare const LOG_THRESHOLD_ALERT_TYPE_ID = "logs.alert.document.count";
export declare const LOG_RULE_TYPE_IDS: string[];
/**
 * Uptime rule types
 */
export declare const UPTIME_RULE_TYPE_IDS: string[];
/**
 * Infra rule types
 */
export declare enum InfraRuleType {
    MetricThreshold = "metrics.alert.threshold",
    InventoryThreshold = "metrics.alert.inventory.threshold"
}
export declare const INFRA_RULE_TYPE_IDS: InfraRuleType[];
export declare const OBSERVABILITY_RULE_TYPE_IDS: string[];
