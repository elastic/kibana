/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';

const KIBANA_NAMESPACE = 'kibana' as const;
const SPACE_IDS = `${KIBANA_NAMESPACE}.space_ids` as const;
const VERSION = `${KIBANA_NAMESPACE}.version` as const;

const ALERT_NAMESPACE = `${KIBANA_NAMESPACE}.alert` as const;
const ALERT_ACTION_GROUP = `${ALERT_NAMESPACE}.action_group` as const;
const ALERT_DURATION = `${ALERT_NAMESPACE}.duration.us` as const;
const ALERT_END = `${ALERT_NAMESPACE}.end` as const;
const ALERT_FLAPPING = `${ALERT_NAMESPACE}.flapping` as const;
const ALERT_ID = `${ALERT_NAMESPACE}.id` as const;
const ALERT_REASON = `${ALERT_NAMESPACE}.reason` as const;
const ALERT_SEVERITY = `${ALERT_NAMESPACE}.severity` as const;
const ALERT_START = `${ALERT_NAMESPACE}.start` as const;
const ALERT_STATUS = `${ALERT_NAMESPACE}.status` as const;
const ALERT_TIME_RANGE = `${ALERT_NAMESPACE}.time_range` as const;
const ALERT_UUID = `${ALERT_NAMESPACE}.uuid` as const;
const ALERT_WORKFLOW_STATUS = `${ALERT_NAMESPACE}.workflow_status` as const;

const ALERT_RULE_NAMESPACE = `${ALERT_NAMESPACE}.rule` as const;
const ALERT_RULE_CATEGORY = `${ALERT_RULE_NAMESPACE}.category` as const;
const ALERT_RULE_CONSUMER = `${ALERT_RULE_NAMESPACE}.consumer` as const;
const ALERT_RULE_EXECUTION_UUID = `${ALERT_RULE_NAMESPACE}.execution.uuid` as const;
const ALERT_RULE_NAME = `${ALERT_RULE_NAMESPACE}.name` as const;
const ALERT_RULE_PARAMETERS = `${ALERT_RULE_NAMESPACE}.parameters` as const;
const ALERT_RULE_PRODUCER = `${ALERT_RULE_NAMESPACE}.producer` as const;
const ALERT_RULE_TAGS = `${ALERT_RULE_NAMESPACE}.tags` as const;
const ALERT_RULE_TYPE_ID = `${ALERT_RULE_NAMESPACE}.rule_type_id` as const;
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
  ALERT_SEVERITY,
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
  ALERT_SEVERITY,
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
