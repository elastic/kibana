/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, LogDocumentOverview } from '../..';
import { fieldConstants, formatFieldValue } from '../..';
import { getFieldValueWithFallback } from './get_field_value_with_fallback';

export function getLogDocumentOverview(
  doc: DataTableRecord,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): LogDocumentOverview {
  const formatField = <T extends keyof LogDocumentOverview>(field: T) => {
    // Use fallback to check both ECS and OTel field names
    const result = getFieldValueWithFallback(doc.flattened, field);
    const value = result.value;
    return (
      value !== undefined && value !== null
        ? formatFieldValue(value, doc.raw, fieldFormats, dataView, dataView.fields.getByName(field))
        : undefined
    ) as LogDocumentOverview[T];
  };

  const levelArray = doc.flattened[fieldConstants.LOG_LEVEL_FIELD];
  const level = Array.isArray(levelArray) && levelArray.length > 0 ? levelArray[0] : levelArray;
  const message = formatField(fieldConstants.MESSAGE_FIELD);
  const errorMessage = formatField(fieldConstants.ERROR_MESSAGE_FIELD);
  const eventOriginal = formatField(fieldConstants.EVENT_ORIGINAL_FIELD);
  const timestamp = formatField(fieldConstants.TIMESTAMP_FIELD);

  // Service
  const serviceName = formatField(fieldConstants.SERVICE_NAME_FIELD);
  const traceId = formatField(fieldConstants.TRACE_ID_FIELD);
  const transactionId = formatField(fieldConstants.TRANSACTION_ID_FIELD);
  const spanId = formatField(fieldConstants.SPAN_ID_FIELD);

  // Infrastructure
  const hostname = formatField(fieldConstants.HOST_NAME_FIELD);
  const orchestratorClusterName = formatField(fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD);
  const orchestratorResourceId = formatField(fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD);

  // Cloud
  const cloudProvider = formatField(fieldConstants.CLOUD_PROVIDER_FIELD);
  const cloudRegion = formatField(fieldConstants.CLOUD_REGION_FIELD);
  const cloudAz = formatField(fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD);
  const cloudProjectId = formatField(fieldConstants.CLOUD_PROJECT_ID_FIELD);
  const cloudInstanceId = formatField(fieldConstants.CLOUD_INSTANCE_ID_FIELD);

  // Other
  const logFilePath = formatField(fieldConstants.LOG_FILE_PATH_FIELD);
  const namespace = formatField(fieldConstants.DATASTREAM_NAMESPACE_FIELD);
  const dataset = formatField(fieldConstants.DATASTREAM_DATASET_FIELD);
  const agentName = formatField(fieldConstants.AGENT_NAME_FIELD);

  // apm  log fields
  const errorLogLevelArray = doc.flattened[fieldConstants.ERROR_LOG_LEVEL_FIELD];
  const errorLogLevel =
    Array.isArray(errorLogLevelArray) && errorLogLevelArray.length > 0
      ? errorLogLevelArray[0]
      : errorLogLevelArray;
  const errorExceptionMessage = formatField(fieldConstants.ERROR_EXCEPTION_MESSAGE);
  const processorEvent = formatField(fieldConstants.PROCESSOR_EVENT_FIELD);

  // otel log fields
  const eventName = formatField(fieldConstants.OTEL_EVENT_NAME_FIELD);
  const exceptionType = formatField(fieldConstants.OTEL_EXCEPTION_TYPE_FIELD);

  // exception message
  const exceptionMessage = formatField(fieldConstants.EXCEPTION_MESSAGE_FIELD);
  const otelExpectionMessage = formatField(fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_MESSAGE);
  const otelExpectionStackTrace = formatField(fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_STACKTRACE);
  const errorExceptionType = formatField(fieldConstants.ERROR_EXCEPTION_TYPE_FIELD);

  // error
  const errorCulprit = formatField(fieldConstants.ERROR_CULPRIT_FIELD);

  return {
    [fieldConstants.LOG_LEVEL_FIELD]: level,
    [fieldConstants.ERROR_LOG_LEVEL_FIELD]: errorLogLevel,
    [fieldConstants.TIMESTAMP_FIELD]: timestamp,
    [fieldConstants.MESSAGE_FIELD]: message,
    [fieldConstants.ERROR_MESSAGE_FIELD]: errorMessage,
    [fieldConstants.EVENT_ORIGINAL_FIELD]: eventOriginal,
    [fieldConstants.SERVICE_NAME_FIELD]: serviceName,
    [fieldConstants.TRACE_ID_FIELD]: traceId,
    [fieldConstants.TRANSACTION_ID_FIELD]: transactionId,
    [fieldConstants.SPAN_ID_FIELD]: spanId,
    [fieldConstants.HOST_NAME_FIELD]: hostname,
    [fieldConstants.ORCHESTRATOR_CLUSTER_NAME_FIELD]: orchestratorClusterName,
    [fieldConstants.ORCHESTRATOR_RESOURCE_ID_FIELD]: orchestratorResourceId,
    [fieldConstants.CLOUD_PROVIDER_FIELD]: cloudProvider,
    [fieldConstants.CLOUD_REGION_FIELD]: cloudRegion,
    [fieldConstants.CLOUD_AVAILABILITY_ZONE_FIELD]: cloudAz,
    [fieldConstants.CLOUD_PROJECT_ID_FIELD]: cloudProjectId,
    [fieldConstants.CLOUD_INSTANCE_ID_FIELD]: cloudInstanceId,
    [fieldConstants.LOG_FILE_PATH_FIELD]: logFilePath,
    [fieldConstants.DATASTREAM_NAMESPACE_FIELD]: namespace,
    [fieldConstants.DATASTREAM_DATASET_FIELD]: dataset,
    [fieldConstants.AGENT_NAME_FIELD]: agentName,
    [fieldConstants.EXCEPTION_MESSAGE_FIELD]: exceptionMessage,
    [fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_MESSAGE]: otelExpectionMessage,
    [fieldConstants.OTEL_ATTRIBUTES_EXCEPTION_STACKTRACE]: otelExpectionStackTrace,
    [fieldConstants.PROCESSOR_EVENT_FIELD]: processorEvent,
    [fieldConstants.OTEL_EVENT_NAME_FIELD]: eventName,
    [fieldConstants.ERROR_EXCEPTION_MESSAGE]: errorExceptionMessage,
    [fieldConstants.ERROR_CULPRIT_FIELD]: errorCulprit,
    [fieldConstants.ERROR_EXCEPTION_TYPE_FIELD]: errorExceptionType,
    [fieldConstants.OTEL_EXCEPTION_TYPE_FIELD]: exceptionType,
  };
}
