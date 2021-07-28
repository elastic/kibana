/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';

const KIBANA_NAMESPACE = 'kibana';
const ALERT_NAMESPACE = `${KIBANA_NAMESPACE}.alert` as const;

const TIMESTAMP = '@timestamp' as const;
const EVENT_KIND = 'event.kind' as const;
const EVENT_ACTION = 'event.action' as const;
const RULE_UUID = 'rule.uuid' as const;
const RULE_ID = 'rule.id' as const;
const RULE_NAME = 'rule.name' as const;
const RULE_CATEGORY = 'rule.category' as const;
const TAGS = 'tags' as const;
const PRODUCER = `${ALERT_NAMESPACE}.producer` as const;
const OWNER = `${ALERT_NAMESPACE}.owner` as const;
const ALERT_ID = `${ALERT_NAMESPACE}.id` as const;
const ALERT_UUID = `${ALERT_NAMESPACE}.uuid` as const;
const ALERT_START = `${ALERT_NAMESPACE}.start` as const;
const ALERT_END = `${ALERT_NAMESPACE}.end` as const;
const ALERT_DURATION = `${ALERT_NAMESPACE}.duration.us` as const;
const ALERT_SEVERITY_LEVEL = `${ALERT_NAMESPACE}.severity.level` as const;
const ALERT_SEVERITY_VALUE = `${ALERT_NAMESPACE}.severity.value` as const;
const ALERT_STATUS = `${ALERT_NAMESPACE}.status` as const;
const SPACE_IDS = 'kibana.space_ids' as const;
const ALERT_REASON = `${ALERT_NAMESPACE}.reason` as const;

const ECS_VERSION = 'ecs.version' as const;

const RULE_NAMESPACE = `${ALERT_NAMESPACE}.rule` as const;

const ALERT_WORKFLOW_STATUS = `${ALERT_NAMESPACE}.workflow_status` as const;
const ALERT_WORKFLOW_USER = `${ALERT_NAMESPACE}.workflow_user` as const;
const ALERT_WORKFLOW_REASON = `${ALERT_NAMESPACE}.workflow_reason` as const;
const ALERT_SYSTEM_STATUS = `${ALERT_NAMESPACE}.system_status` as const;
const ALERT_ACTION_GROUP = `${ALERT_NAMESPACE}.action_group.*` as const;

const ALERT_SEVERITY = `${ALERT_NAMESPACE}.severity` as const;
const ALERT_RISK_SCORE = `${ALERT_NAMESPACE}.risk_score` as const;
const ALERT_RULE_SEVERITY = `${ALERT_NAMESPACE}.rule.severity` as const;
const ALERT_RULE_RISK_SCORE = `${ALERT_NAMESPACE}.rule.risk_score` as const;
const ALERT_RULE_AUTHOR = `${RULE_NAMESPACE}.author` as const;
const ALERT_RULE_CONSUMERS = `${RULE_NAMESPACE}.consumers` as const;
const ALERT_RULE_CREATED_AT = `${RULE_NAMESPACE}.created_at` as const;
const ALERT_RULE_CREATED_BY = `${RULE_NAMESPACE}.created_by` as const;
const ALERT_RULE_DESCRIPTION = `${RULE_NAMESPACE}.description` as const;
const ALERT_RULE_ENABLED = `${RULE_NAMESPACE}.enabled` as const;
const ALERT_RULE_FROM = `${RULE_NAMESPACE}.from` as const;
const ALERT_RULE_ID = `${RULE_NAMESPACE}.id` as const;
const ALERT_RULE_INTERVAL = `${RULE_NAMESPACE}.interval` as const;
const ALERT_RULE_LICENSE = `${RULE_NAMESPACE}.license` as const;
const ALERT_RULE_NAME = `${RULE_NAMESPACE}.name` as const;
const ALERT_RULE_NOTE = `${RULE_NAMESPACE}.note` as const;
const ALERT_RULE_REFERENCES = `${RULE_NAMESPACE}.references` as const;
const ALERT_RULE_RISK_SCORE_MAPPING = `${RULE_NAMESPACE}.risk_score_mapping` as const;
const ALERT_RULE_RULE_ID = `${RULE_NAMESPACE}.rule_id` as const;
const ALERT_RULE_RULE_NAME_OVERRIDE = `${RULE_NAMESPACE}.rule_name_override` as const;
const ALERT_RULE_SEVERITY_MAPPING = `${RULE_NAMESPACE}.severity_mapping` as const;
const ALERT_RULE_TAGS = `${RULE_NAMESPACE}.tags` as const;
const ALERT_RULE_TO = `${RULE_NAMESPACE}.to` as const;
const ALERT_RULE_TYPE = `${RULE_NAMESPACE}.type` as const;
const ALERT_RULE_UPDATED_AT = `${RULE_NAMESPACE}.updated_at` as const;
const ALERT_RULE_UPDATED_BY = `${RULE_NAMESPACE}.updated_by` as const;
const ALERT_RULE_VERSION = `${RULE_NAMESPACE}.version` as const;
const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;

const fields = {
  ECS_VERSION,
  TIMESTAMP,
  EVENT_KIND,
  EVENT_ACTION,
  RULE_UUID,
  RULE_ID,
  RULE_NAME,
  RULE_CATEGORY,
  TAGS,
  PRODUCER,
  OWNER,
  ALERT_ID,
  ALERT_UUID,
  ALERT_START,
  ALERT_END,
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_SEVERITY_VALUE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMERS,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_ID,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_RISK_SCORE,
  ALERT_SEVERITY,
  ALERT_RISK_SCORE,
  ALERT_STATUS,
  ALERT_SYSTEM_STATUS,
  ALERT_ACTION_GROUP,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
  ALERT_WORKFLOW_REASON,
  SPACE_IDS,
};

export {
  ECS_VERSION,
  TIMESTAMP,
  EVENT_KIND,
  EVENT_ACTION,
  RULE_UUID,
  RULE_ID,
  RULE_NAME,
  RULE_CATEGORY,
  TAGS,
  PRODUCER,
  OWNER,
  ALERT_ID,
  ALERT_UUID,
  ALERT_START,
  ALERT_END,
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_SEVERITY_VALUE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CONSUMERS,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_ID,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RISK_SCORE_MAPPING,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_SEVERITY_MAPPING,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_RISK_SCORE,
  ALERT_SEVERITY,
  ALERT_RISK_SCORE,
  ALERT_SYSTEM_STATUS,
  ALERT_ACTION_GROUP,
  ALERT_STATUS,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_USER,
  ALERT_WORKFLOW_REASON,
  SPACE_IDS,
};

export type TechnicalRuleDataFieldName = ValuesType<typeof fields>;
