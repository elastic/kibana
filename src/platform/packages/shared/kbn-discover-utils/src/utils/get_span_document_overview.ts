/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { DataTableRecord, SpanDocumentOverview, fieldConstants } from '../..';

export function getSpanDocumentOverview(doc: DataTableRecord): SpanDocumentOverview {
  const formatField = <T extends keyof SpanDocumentOverview>(field: T) =>
    castArray(doc.flattened[field])[0] as SpanDocumentOverview[T];

  const fields: Array<keyof SpanDocumentOverview> = [
    fieldConstants.TIMESTAMP_FIELD,
    fieldConstants.PARENT_ID_FIELD,
    fieldConstants.HTTP_RESPONSE_STATUS_CODE_FIELD,
    fieldConstants.TRACE_ID_FIELD,
    fieldConstants.SERVICE_NAME_FIELD,
    fieldConstants.SERVICE_ENVIRONMENT_FIELD,
    fieldConstants.AGENT_NAME_FIELD,
    fieldConstants.TRANSACTION_ID_FIELD,
    fieldConstants.TRANSACTION_NAME_FIELD,
    fieldConstants.SPAN_NAME_FIELD,
    fieldConstants.SPAN_ACTION_FIELD,
    fieldConstants.SPAN_DURATION_FIELD,
    fieldConstants.SPAN_TYPE_FIELD,
    fieldConstants.SPAN_SUBTYPE_FIELD,
    fieldConstants.SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
    fieldConstants.USER_AGENT_NAME_FIELD,
    fieldConstants.USER_AGENT_VERSION_FIELD,
    fieldConstants.PROCESSOR_EVENT_FIELD,
  ];

  return fields.reduce((acc, field) => {
    acc[field] = formatField(field);
    return acc;
  }, {} as { [key in keyof SpanDocumentOverview]?: string | number }) as SpanDocumentOverview;
}
