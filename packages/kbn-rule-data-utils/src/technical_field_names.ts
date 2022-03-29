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

const ECS_VERSION = 'ecs.version' as const;
const EVENT_ACTION = 'event.action' as const;
const EVENT_KIND = 'event.kind' as const;
const EVENT_MODULE = 'event.module' as const;
const SPACE_IDS = `${KIBANA_NAMESPACE}.space_ids` as const;
const TAGS = 'tags' as const;
const TIMESTAMP = '@timestamp' as const;
const VERSION = `${KIBANA_NAMESPACE}.version` as const;

// Fields pertaining to the alert
const ALERT_ACTION_GROUP = `${ALERT_NAMESPACE}.action_group` as const;
const ALERT_BUILDING_BLOCK_TYPE = `${ALERT_NAMESPACE}.building_block_type` as const;
const ALERT_DURATION = `${ALERT_NAMESPACE}.duration.us` as const;
const ALERT_END = `${ALERT_NAMESPACE}.end` as const;
const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;
const ALERT_INSTANCE_ID = `${ALERT_NAMESPACE}.instance.id` as const;
const ALERT_REASON = `${ALERT_NAMESPACE}.reason` as const;
const ALERT_RISK_SCORE = `${ALERT_NAMESPACE}.risk_score` as const;
const ALERT_SEVERITY = `${ALERT_NAMESPACE}.severity` as const;
const ALERT_START = `${ALERT_NAMESPACE}.start` as const;
const ALERT_STATUS = `${ALERT_NAMESPACE}.status` as const;
const ALERT_SYSTEM_STATUS = `${ALERT_NAMESPACE}.system_status` as const;
const ALERT_UUID = `${ALERT_NAMESPACE}.uuid` as const;
const ALERT_WORKFLOW_REASON = `${ALERT_NAMESPACE}.workflow_reason` as const;
const ALERT_WORKFLOW_STATUS = `${ALERT_NAMESPACE}.workflow_status` as const;
const ALERT_WORKFLOW_USER = `${ALERT_NAMESPACE}.workflow_user` as const;

// Fields pertaining to the rule associated with the alert
const ALERT_RULE_AUTHOR = `${ALERT_RULE_NAMESPACE}.author` as const;
const ALERT_RULE_CREATED_AT = `${ALERT_RULE_NAMESPACE}.created_at` as const;
const ALERT_RULE_CREATED_BY = `${ALERT_RULE_NAMESPACE}.created_by` as const;
const ALERT_RULE_DESCRIPTION = `${ALERT_RULE_NAMESPACE}.description` as const;
const ALERT_RULE_ENABLED = `${ALERT_RULE_NAMESPACE}.enabled` as const;
const ALERT_RULE_EXCEPTIONS_LIST = `${ALERT_RULE_NAMESPACE}.exceptions_list` as const;
const ALERT_RULE_EXECUTION_UUID = `${ALERT_RULE_NAMESPACE}.execution.uuid` as const;
const ALERT_RULE_FROM = `${ALERT_RULE_NAMESPACE}.from` as const;
const ALERT_RULE_INTERVAL = `${ALERT_RULE_NAMESPACE}.interval` as const;
const ALERT_RULE_LICENSE = `${ALERT_RULE_NAMESPACE}.license` as const;
const ALERT_RULE_CATEGORY = `${ALERT_RULE_NAMESPACE}.category` as const;
const ALERT_RULE_NAME = `${ALERT_RULE_NAMESPACE}.name` as const;
const ALERT_RULE_NOTE = `${ALERT_RULE_NAMESPACE}.note` as const;
const ALERT_RULE_PARAMETERS = `${ALERT_RULE_NAMESPACE}.parameters` as const;
const ALERT_RULE_REFERENCES = `${ALERT_RULE_NAMESPACE}.references` as const;
const ALERT_RULE_RULE_ID = `${ALERT_RULE_NAMESPACE}.rule_id` as const;
const ALERT_RULE_RULE_NAME_OVERRIDE = `${ALERT_RULE_NAMESPACE}.rule_name_override` as const;
const ALERT_RULE_TAGS = `${ALERT_RULE_NAMESPACE}.tags` as const;
const ALERT_RULE_TO = `${ALERT_RULE_NAMESPACE}.to` as const;
const ALERT_RULE_TYPE = `${ALERT_RULE_NAMESPACE}.type` as const;
const ALERT_RULE_TYPE_ID = `${ALERT_RULE_NAMESPACE}.rule_type_id` as const;
const ALERT_RULE_UPDATED_AT = `${ALERT_RULE_NAMESPACE}.updated_at` as const;
const ALERT_RULE_UPDATED_BY = `${ALERT_RULE_NAMESPACE}.updated_by` as const;
const ALERT_RULE_VERSION = `${ALERT_RULE_NAMESPACE}.version` as const;
// the feature instantiating a rule type.
// Rule created in stack --> alerts
// Rule created in siem --> siem
const ALERT_RULE_CONSUMER = `${ALERT_RULE_NAMESPACE}.consumer` as const;
// the plugin that registered the rule type.
// Rule type apm.error_rate --> apm
// Rule type siem.signals --> siem
const ALERT_RULE_PRODUCER = `${ALERT_RULE_NAMESPACE}.producer` as const;
const ALERT_RULE_UUID = `${ALERT_RULE_NAMESPACE}.uuid` as const;

const namespaces = {
  KIBANA_NAMESPACE,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
};

const fields = {
  ECS_VERSION,
  EVENT_KIND,
  EVENT_ACTION,
  EVENT_MODULE,
  TAGS,
  TIMESTAMP,
  ALERT_ACTION_GROUP,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_START,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_SYSTEM_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
  ALERT_RULE_UUID,
  ALERT_RULE_CATEGORY,
  SPACE_IDS,
  VERSION,
};

export {
  ALERT_ACTION_GROUP,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
  ALERT_REASON,
  ALERT_RISK_SCORE,
  ALERT_STATUS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_SYSTEM_STATUS,
  ALERT_UUID,
  ECS_VERSION,
  EVENT_ACTION,
  EVENT_KIND,
  EVENT_MODULE,
  KIBANA_NAMESPACE,
  ALERT_RULE_UUID,
  ALERT_RULE_CATEGORY,
  TAGS,
  TIMESTAMP,
  SPACE_IDS,
  VERSION,
};

export type TechnicalRuleDataFieldName = ValuesType<typeof fields & typeof namespaces>;
