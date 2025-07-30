/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, SpanDocumentOverview } from '../types';
import { fieldConstants } from '..';
import { getFormattedFields } from './get_formatted_fields';
import { getFlattenedFields } from './get_flattened_fields';

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
  fieldConstants.SPAN_ID_FIELD,
  fieldConstants.SPAN_ACTION_FIELD,
  fieldConstants.SPAN_DURATION_FIELD,
  fieldConstants.SPAN_TYPE_FIELD,
  fieldConstants.SPAN_SUBTYPE_FIELD,
  fieldConstants.SPAN_DESTINATION_SERVICE_RESOURCE_FIELD,
  fieldConstants.USER_AGENT_NAME_FIELD,
  fieldConstants.USER_AGENT_VERSION_FIELD,
  fieldConstants.PROCESSOR_EVENT_FIELD,
  fieldConstants.OTEL_DURATION,
  fieldConstants.OTEL_SPAN_KIND,
  fieldConstants.OTEL_RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
];

export function getSpanDocumentOverview(
  doc: DataTableRecord,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): SpanDocumentOverview {
  return getFormattedFields<SpanDocumentOverview>(doc, fields, { dataView, fieldFormats });
}

export function getFlattenedSpanDocumentOverview(doc: DataTableRecord): SpanDocumentOverview {
  return getFlattenedFields<SpanDocumentOverview>(doc, fields);
}
