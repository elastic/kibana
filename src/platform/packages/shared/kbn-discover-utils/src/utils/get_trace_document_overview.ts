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
import {
  AGENT_NAME,
  AT_TIMESTAMP,
  DURATION,
  HTTP_RESPONSE_STATUS_CODE,
  KIND,
  LINKS_SPAN_ID,
  LINKS_TRACE_ID,
  PARENT_ID,
  PROCESSOR_EVENT,
  RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_ACTION,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_LINKS_SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
} from '@kbn/apm-types';
import type { DataTableRecord, TraceDocumentOverview } from '../types';
import { getFormattedFields } from './get_formatted_fields';
import { getFlattenedFields } from './get_flattened_fields';

const fields: Array<keyof TraceDocumentOverview> = [
  AT_TIMESTAMP,
  PARENT_ID,
  HTTP_RESPONSE_STATUS_CODE,
  TRACE_ID,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  AGENT_NAME,
  TRANSACTION_ID,
  TRANSACTION_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_TYPE,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
  SPAN_NAME,
  SPAN_ID,
  SPAN_ACTION,
  SPAN_DURATION,
  SPAN_TYPE,
  SPAN_SUBTYPE,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  USER_AGENT_NAME,
  USER_AGENT_VERSION,
  PROCESSOR_EVENT,
  DURATION,
  KIND,
  RESOURCE_ATTRIBUTES_TELEMETRY_SDK_LANGUAGE,
  SPAN_LINKS_SPAN_ID,
  SPAN_LINKS_TRACE_ID,
  LINKS_SPAN_ID,
  LINKS_TRACE_ID,
];

export function getTraceDocumentOverview(
  doc: DataTableRecord,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): TraceDocumentOverview {
  return getFormattedFields<TraceDocumentOverview>(doc, fields, { dataView, fieldFormats });
}

export function getFlattenedTraceDocumentOverview(doc: DataTableRecord): TraceDocumentOverview {
  return getFlattenedFields<TraceDocumentOverview>(doc, fields);
}
