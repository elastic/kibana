/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';

const KIBANA_NAMESPACE = 'kibana' as const;
const ALERT_NAMESPACE = `${KIBANA_NAMESPACE}.alert` as const;
const ALERT_RULE_NAMESPACE = `${ALERT_NAMESPACE}.rule` as const;

// kibana.space_ids - space ID(s) of the rule that created this alert
const SPACE_IDS = `${KIBANA_NAMESPACE}.space_ids` as const;

// kibana.version - Kibana version that this alert was created
const VERSION = `${KIBANA_NAMESPACE}.version` as const;

// kibana.alert.action_group - framework action group ID for this alert
const ALERT_ACTION_GROUP = `${ALERT_NAMESPACE}.action_group` as const;

// kibana.alert.duration.us - alert duration in nanoseconds - updated each execution
// that the alert is active
const ALERT_DURATION = `${ALERT_NAMESPACE}.duration.us` as const;

// kibana.alert.end - timestamp when the alert is auto-recovered by the framework
const ALERT_END = `${ALERT_NAMESPACE}.end` as const;

// kibana.alert.flapping - whether the alert is currently in a flapping state
const ALERT_FLAPPING = `${ALERT_NAMESPACE}.flapping` as const;

// kibana.alert.id - alert ID, also known as alert instance ID
const ALERT_ID = `${ALERT_NAMESPACE}.id` as const;

// kibana.alert.last_detected - timestamp when the alert was last seen
const ALERT_LAST_DETECTED = `${ALERT_NAMESPACE}.last_detected` as const;

// kibana.alert.reason - human readable reason that this alert is active
const ALERT_REASON = `${ALERT_NAMESPACE}.reason` as const;

// kibana.alert.start - timestamp when the alert is first active
const ALERT_START = `${ALERT_NAMESPACE}.start` as const;

// kibana.alert.status - active/recovered status of alert
const ALERT_STATUS = `${ALERT_NAMESPACE}.status` as const;

// kibana.alert.time_range - time range of alert from kibana.alert.start to now
const ALERT_TIME_RANGE = `${ALERT_NAMESPACE}.time_range` as const;

// kibana.alert.uuid - unique ID for the active span of this alert
const ALERT_UUID = `${ALERT_NAMESPACE}.uuid` as const;

// kibana.alert.workflow_status - open/closed status of alert
const ALERT_WORKFLOW_STATUS = `${ALERT_NAMESPACE}.workflow_status` as const;

// kibana.alert.rule.category - rule type name for rule that generated this alert
const ALERT_RULE_CATEGORY = `${ALERT_RULE_NAMESPACE}.category` as const;

// kibana.alert.rule.consumer - consumer for rule that generated this alert
const ALERT_RULE_CONSUMER = `${ALERT_RULE_NAMESPACE}.consumer` as const;

// kibana.alert.rule.execution.uuid - unique ID for the rule execution that generated this alert
const ALERT_RULE_EXECUTION_UUID = `${ALERT_RULE_NAMESPACE}.execution.uuid` as const;

// kibana.alert.rule.name - rule name for rule that generated this alert
const ALERT_RULE_NAME = `${ALERT_RULE_NAMESPACE}.name` as const;

// kibana.alert.rule.parameters - rule parameters for rule that generated this alert
const ALERT_RULE_PARAMETERS = `${ALERT_RULE_NAMESPACE}.parameters` as const;

// kibana.alert.rule.producer - rule type producer for rule that generated this alert
const ALERT_RULE_PRODUCER = `${ALERT_RULE_NAMESPACE}.producer` as const;

// kibana.alert.rule.tags - rule tags for rule that generated this alert
const ALERT_RULE_TAGS = `${ALERT_RULE_NAMESPACE}.tags` as const;

// kibana.alert.rule_type_id - rule type id for rule that generated this alert
const ALERT_RULE_TYPE_ID = `${ALERT_RULE_NAMESPACE}.rule_type_id` as const;

// kibana.alert.rule.uuid - rule ID for rule that generated this alert
const ALERT_RULE_UUID = `${ALERT_RULE_NAMESPACE}.uuid` as const;

const namespaces = {
  KIBANA_NAMESPACE,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
};

const fields = {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_ID,
  ALERT_LAST_DETECTED,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  VERSION,
};

export {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_ID,
  ALERT_LAST_DETECTED,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  SPACE_IDS,
  VERSION,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
  KIBANA_NAMESPACE,
};

export type DefaultAlertFieldName = ValuesType<typeof fields & typeof namespaces>;
