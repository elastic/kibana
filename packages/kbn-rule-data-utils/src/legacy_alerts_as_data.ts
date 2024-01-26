/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ALERT_NAMESPACE, ALERT_RULE_NAMESPACE } from './default_alerts_as_data';

const ECS_VERSION = 'ecs.version' as const;
const EVENT_ACTION = 'event.action' as const;
const EVENT_KIND = 'event.kind' as const;
const TAGS = 'tags' as const;

// These are the fields that are in the rule registry technical component template
// that are NOT in the framework alerts as data common component template

// We will maintain a legacy component template that can be used by legacy
// rule registry rules with these fields.
const ALERT_RISK_SCORE = `${ALERT_NAMESPACE}.risk_score` as const;
const ALERT_RULE_AUTHOR = `${ALERT_RULE_NAMESPACE}.author` as const;
const ALERT_RULE_CREATED_AT = `${ALERT_RULE_NAMESPACE}.created_at` as const;
const ALERT_RULE_CREATED_BY = `${ALERT_RULE_NAMESPACE}.created_by` as const;
const ALERT_RULE_DESCRIPTION = `${ALERT_RULE_NAMESPACE}.description` as const;
const ALERT_RULE_ENABLED = `${ALERT_RULE_NAMESPACE}.enabled` as const;
const ALERT_RULE_FROM = `${ALERT_RULE_NAMESPACE}.from` as const;
const ALERT_RULE_INTERVAL = `${ALERT_RULE_NAMESPACE}.interval` as const;
const ALERT_RULE_LICENSE = `${ALERT_RULE_NAMESPACE}.license` as const;
const ALERT_RULE_NOTE = `${ALERT_RULE_NAMESPACE}.note` as const;
const ALERT_RULE_REFERENCES = `${ALERT_RULE_NAMESPACE}.references` as const;
const ALERT_RULE_RULE_ID = `${ALERT_RULE_NAMESPACE}.rule_id` as const;
const ALERT_RULE_RULE_NAME_OVERRIDE = `${ALERT_RULE_NAMESPACE}.rule_name_override` as const;
const ALERT_RULE_TO = `${ALERT_RULE_NAMESPACE}.to` as const;
const ALERT_RULE_TYPE = `${ALERT_RULE_NAMESPACE}.type` as const;
const ALERT_RULE_UPDATED_AT = `${ALERT_RULE_NAMESPACE}.updated_at` as const;
const ALERT_RULE_UPDATED_BY = `${ALERT_RULE_NAMESPACE}.updated_by` as const;
const ALERT_RULE_VERSION = `${ALERT_RULE_NAMESPACE}.version` as const;
const ALERT_SEVERITY = `${ALERT_NAMESPACE}.severity` as const;
const ALERT_SUPPRESSION_META = `${ALERT_NAMESPACE}.suppression` as const;
const ALERT_SUPPRESSION_TERMS = `${ALERT_SUPPRESSION_META}.terms` as const;
const ALERT_SUPPRESSION_FIELD = `${ALERT_SUPPRESSION_TERMS}.field` as const;
const ALERT_SUPPRESSION_VALUE = `${ALERT_SUPPRESSION_TERMS}.value` as const;
const ALERT_SUPPRESSION_START = `${ALERT_SUPPRESSION_META}.start` as const;
const ALERT_SUPPRESSION_END = `${ALERT_SUPPRESSION_META}.end` as const;
const ALERT_SUPPRESSION_DOCS_COUNT = `${ALERT_SUPPRESSION_META}.docs_count` as const;
const ALERT_SYSTEM_STATUS = `${ALERT_NAMESPACE}.system_status` as const;
const ALERT_WORKFLOW_REASON = `${ALERT_NAMESPACE}.workflow_reason` as const;
const ALERT_WORKFLOW_USER = `${ALERT_NAMESPACE}.workflow_user` as const;
const ALERT_WORKFLOW_STATUS_UPDATED_AT = `${ALERT_NAMESPACE}.workflow_status_updated_at` as const;

export {
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_FIELD,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_VALUE,
  ALERT_SYSTEM_STATUS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_USER,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ECS_VERSION,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
};
