/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewBase, DataViewFieldBase } from '@kbn/es-query';

export const WORKFLOWS_EVENTS_DATA_STREAM = '.workflows-events';

export const WORKFLOWS_EVENTS_DATA_VIEW_FIELDS: DataViewFieldBase[] = [
  { name: '@timestamp', type: 'date', esTypes: ['date'] },
  { name: 'eventId', type: 'string', esTypes: ['keyword'] },
  { name: 'triggerId', type: 'string', esTypes: ['keyword'] },
  { name: 'spaceId', type: 'string', esTypes: ['keyword'] },
  { name: 'sourceExecutionId', type: 'string', esTypes: ['keyword'] },
  { name: 'subscriptions', type: 'string', esTypes: ['keyword'] },
  { name: 'payload', type: 'object', esTypes: ['object'] },
];

export const WORKFLOWS_EVENTS_DATA_VIEW: DataViewBase = {
  title: WORKFLOWS_EVENTS_DATA_STREAM,
  fields: [...WORKFLOWS_EVENTS_DATA_VIEW_FIELDS],
};
