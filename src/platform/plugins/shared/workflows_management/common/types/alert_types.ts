/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface AlertSelection {
  _id: string;
  _index: string;
}

export interface AlertTriggerInput {
  event: {
    alertIds: AlertSelection[];
    triggerType: 'alert';
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
  alerts: unknown[];
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
}
