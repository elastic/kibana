/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';

const ALERT_NAMESPACE = 'kibana.rac.alert';

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
const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;

const fields = {
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
  ALERT_STATUS,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
};

export {
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
  ALERT_STATUS,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
};

export type TechnicalRuleDataFieldName = ValuesType<typeof fields>;
