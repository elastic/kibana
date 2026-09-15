/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertHit } from '@kbn/alerting-plugin/server/types';
import type { DocumentSelection, EventQuerySelection } from './document_types';

export interface AlertTriggerInput {
  event: {
    triggerType: 'alert';
    /** Explicit id selection, expanded server-side via mget. */
    alertIds?: DocumentSelection[];
    /** Query-based selection expanded server-side. Mutually exclusive with `alertIds`. */
    querySelection?: EventQuerySelection;
    /** Optional rule type ids, carried for context/telemetry. */
    ruleTypeIds?: string[];
  };
}

export interface AlertEventRule {
  id: string;
  name: string;
  tags: string[];
  consumer: string;
  producer: string;
  ruleTypeId: string;
}

export interface AlertEvent {
  alerts: AlertHit[];
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
}
