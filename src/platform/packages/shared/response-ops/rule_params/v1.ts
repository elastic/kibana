/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import path from 'node:path';
import type { Type, TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { mlAnomalyDetectionAlertParamsSchemaV1 } from './anomaly_detection';
import { anomalyDetectionJobsHealthRuleParamsSchemaV1 } from './anomaly_detection_jobs_health';
import { anomalyParamsSchemaV1 } from './apm_anomaly';
import { ccrReadExceptionsParamsSchemaV1 } from './ccr_read_exceptions';
import { clusterHealthParamsSchemaV1 } from './cluster_health';
import { cpuUsageParamsSchemaV1 } from './cpu_usage';
import { customThresholdParamsSchemaV1 } from './custom_threshold';
import { degradedDocsParamsSchemaV1 } from './degraded_docs';
import { diskUsageParamsSchemaV1 } from './disk_usage';
import { errorCountParamsSchemaV1 } from './error_count';
import { EsQueryRuleParamsSchemaV1 } from './es_query';
import { esVersionMismatchParamsSchemaV1 } from './es_version_mismatch';
import { trackingContainmentRuleParamsSchemaV1 } from './geo_containment';
import { IndexThresholdRuleParamsSchemaV1 } from './index_threshold';
import { kibanaVersionMismatchParamsSchemaV1 } from './kibana_version_mismatch';
import { largeShardSizeParamsSchemaV1 } from './large_shard_size';
import { licenseExpirationParamsSchemaV1 } from './license_expiration';
import { logThresholdParamsSchemaV1 } from './log_threshold';
import { logstashVersionMismatchParamsSchemaV1 } from './logstash_version_mismatch';
import { memoryUsageParamsSchemaV1 } from './memory_usage';
import { metricInventoryThresholdRuleParamsSchemaV1 } from './metric_inventory_threshold';
import { metricThresholdRuleParamsSchemaV1 } from './metric_threshold';
import { missingMonitoringDataParamsSchemaV1 } from './missing_monitoring_data';
import { nodesChangedParamsSchemaV1 } from './nodes_changed';
import { sloBurnRateParamsSchemaV1 } from './slo_burn_rate';
import { syntheticsMonitorStatusRuleParamsSchemaV1 } from './synthetics_monitor_status';
import { tlsRuleParamsSchemaV1 } from './synthetics_tls';
import { threadPoolSearchRejectionsParamsSchemaV1 } from './thread_pool_search_rejections';
import { threadPoolWriteRejectionsParamsSchemaV1 } from './thread_pool_write_rejections';
import { transactionDurationParamsSchemaV1 } from './transaction_duration';
import { transactionErrorRateParamsSchemaV1 } from './transaction_error_rate';
import { transformHealthRuleParamsSchemaV1 } from './transform_health';
import { uptimeDurationAnomalyRuleParamsSchemaV1 } from './uptime_duration_anomaly';
import { uptimeMonitorStatusRuleParamsSchemaV1 } from './uptime_monitor_status';
import { uptimeTLSRuleParamsSchemaV1 } from './uptime_tls';

export const RULE_TYPE_ID = 'rule_type_id';
export const ALERT_TYPE_ID = 'alertTypeId';
type RuleTypeIdKey = typeof RULE_TYPE_ID | typeof ALERT_TYPE_ID;

const ruleParamsSchemasWithRuleTypeId: Record<string, Type<any>> = {
  monitoring_ccr_read_exceptions: ccrReadExceptionsParamsSchemaV1,
  monitoring_alert_cluster_health: clusterHealthParamsSchemaV1,
  monitoring_alert_cpu_usage: cpuUsageParamsSchemaV1,
  monitoring_alert_disk_usage: diskUsageParamsSchemaV1,
  monitoring_alert_elasticsearch_version_mismatch: esVersionMismatchParamsSchemaV1,
  monitoring_alert_kibana_version_mismatch: kibanaVersionMismatchParamsSchemaV1,
  monitoring_alert_license_expiration: licenseExpirationParamsSchemaV1,
  monitoring_alert_logstash_version_mismatch: logstashVersionMismatchParamsSchemaV1,
  monitoring_alert_jvm_memory_usage: memoryUsageParamsSchemaV1,
  monitoring_alert_missing_monitoring_data: missingMonitoringDataParamsSchemaV1,
  monitoring_alert_nodes_changed: nodesChangedParamsSchemaV1,
  monitoring_shard_size: largeShardSizeParamsSchemaV1,
  monitoring_alert_thread_pool_search_rejections: threadPoolSearchRejectionsParamsSchemaV1,
  monitoring_alert_thread_pool_write_rejections: threadPoolWriteRejectionsParamsSchemaV1,
  'xpack.ml.anomaly_detection_alert': mlAnomalyDetectionAlertParamsSchemaV1,
  'xpack.ml.anomaly_detection_jobs_health': anomalyDetectionJobsHealthRuleParamsSchemaV1,
  'datasetQuality.degradedDocs': degradedDocsParamsSchemaV1,
  '.es-query': EsQueryRuleParamsSchemaV1,
  '.index-threshold': IndexThresholdRuleParamsSchemaV1,
  '.geo-containment': trackingContainmentRuleParamsSchemaV1,
  transform_health: transformHealthRuleParamsSchemaV1,
  'apm.anomaly': anomalyParamsSchemaV1,
  'apm.error_rate': errorCountParamsSchemaV1,
  'apm.transaction_error_rate': transactionErrorRateParamsSchemaV1,
  'apm.transaction_duration': transactionDurationParamsSchemaV1,
  'xpack.synthetics.alerts.monitorStatus': syntheticsMonitorStatusRuleParamsSchemaV1,
  'xpack.synthetics.alerts.tls': tlsRuleParamsSchemaV1,
  'xpack.uptime.alerts.monitorStatus': uptimeMonitorStatusRuleParamsSchemaV1,
  'xpack.uptime.alerts.tlsCertificate': uptimeTLSRuleParamsSchemaV1,
  'xpack.uptime.alerts.durationAnomaly': uptimeDurationAnomalyRuleParamsSchemaV1,
  'metrics.alert.inventory.threshold': metricInventoryThresholdRuleParamsSchemaV1,
  'metrics.alert.threshold': metricThresholdRuleParamsSchemaV1,
  'observability.rules.custom_threshold': customThresholdParamsSchemaV1,
  'logs.alert.document.count': logThresholdParamsSchemaV1,
  'slo.rules.burnRate': sloBurnRateParamsSchemaV1,
};

const buildKeyLiterals = () =>
  schema.oneOf(
    Object.keys(ruleParamsSchemasWithRuleTypeId).map((k) => schema.literal(k)) as [Type<string>]
  );

const buildParamsConditional = (key: string) =>
  Object.entries(ruleParamsSchemasWithRuleTypeId).reduce<Type<any> | Type<never>>(
    (accSchema, [ruleTypeId, paramsSchema]) => {
      return schema.conditional(schema.siblingRef(key), ruleTypeId, paramsSchema, accSchema);
    },
    schema.never()
  );

export const ruleParamsSchemaWithRuleTypeId = (key: RuleTypeIdKey = RULE_TYPE_ID) =>
  schema.object(
    {
      [key]: buildKeyLiterals(),
      params: buildParamsConditional(key),
    },
    {
      meta: { description: 'The parameters for the rule.' },
    }
  );

export const ruleParamsSchemaWithRuleTypeIdAndDefaultValue = (key: RuleTypeIdKey = RULE_TYPE_ID) =>
  schema.object(
    {
      [key]: buildKeyLiterals(),
      params: buildParamsConditional(key),
    },
    {
      defaultValue: {},
      meta: { description: 'The parameters for the rule.' },
    }
  );

export const ruleParamsSchemaWithRuleTypeIdForUpdate = schema.oneOf(
  Object.values(ruleParamsSchemasWithRuleTypeId).map((schemaValue) => schemaValue) as [Type<any>],
  {
    meta: { description: 'The parameters for the rule.' },
  }
);

export const ruleParamsSchemaWithRuleTypeIdAndDefaultValueForUpdate = schema.oneOf(
  Object.values(ruleParamsSchemasWithRuleTypeId).map((schemaValue) => schemaValue) as [Type<any>],
  {
    defaultValue: {},
    meta: { description: 'The parameters for the rule.' },
  }
);

export const createRuleParamsExamples = () =>
  path.join(__dirname, 'examples_create_rule_params.yaml');

export type RuleParams = TypeOf<typeof ruleParamsSchemaWithRuleTypeId>;
export type RuleParamsWithDefaultValue = TypeOf<
  typeof ruleParamsSchemaWithRuleTypeIdAndDefaultValue
>;

export type RuleParamsForUpdate = TypeOf<typeof ruleParamsSchemaWithRuleTypeIdForUpdate>;
export type RuleParamsWithDefaultValueForUpdate = TypeOf<
  typeof ruleParamsSchemaWithRuleTypeIdAndDefaultValueForUpdate
>;
