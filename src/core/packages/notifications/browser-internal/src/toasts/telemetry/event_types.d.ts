/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EventTypeOpts } from '@elastic/ebt/client';
export declare enum EventMetric {
  TOAST_DISMISSED = 'global_toast_list_toast_dismissed',
}
export declare enum FieldType {
  RECURRENCE_COUNT = 'toast_deduplication_count',
  TOAST_MESSAGE = 'toast_message',
  TOAST_MESSAGE_TYPE = 'toast_message_type',
}
export declare const eventTypes: Array<EventTypeOpts<Record<string, unknown>>>;
