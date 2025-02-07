/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { castArray } from 'lodash';
import { DataTableRecord, TraceDocumentOverview, fieldConstants } from '../..';

export function getTraceDocumentOverview(doc: DataTableRecord): TraceDocumentOverview {
  const formatField = <T extends keyof TraceDocumentOverview>(field: T) => {
    return castArray(doc.flattened[field])[0] as TraceDocumentOverview[T];
  };

  const timestamp = formatField(fieldConstants.TIMESTAMP_FIELD);
  const traceId = formatField(fieldConstants.TRACE_ID_FIELD);
  const httpResponseStatusCode = formatField(fieldConstants.HTTP_RESPONSE_STATUS_CODE_FIELD);

  // Service
  const serviceName = formatField(fieldConstants.SERVICE_NAME_FIELD);
  const serviceEnvironment = formatField(fieldConstants.SERVICE_ENVIRONMENT_FIELD);
  const agentName = formatField(fieldConstants.AGENT_NAME_FIELD);

  // Transaction
  const transactionId = formatField(fieldConstants.TRANSACTION_ID_FIELD);
  const transactionName = formatField(fieldConstants.TRANSACTION_NAME_FIELD);
  const transactionDuration = formatField(fieldConstants.TRANSACTION_DURATION_FIELD);

  // Span
  const parentId = formatField(fieldConstants.PARENT_ID_FIELD);
  const spanName = formatField(fieldConstants.SPAN_NAME_FIELD);
  const spanAction = formatField(fieldConstants.SPAN_ACTION_FIELD);
  const spanDuration = formatField(fieldConstants.SPAN_DURATION_FIELD);
  const spanType = formatField(fieldConstants.SPAN_TYPE_FIELD);
  const spanSubtype = formatField(fieldConstants.SPAN_SUBTYPE_FIELD);
  const spanDestinationServiceResource = formatField(
    fieldConstants.SPAN_DESTINATION_SERVICE_RESOURCE_FIELD
  );

  // UserAgent
  const userAgentName = formatField(fieldConstants.USER_AGENT_NAME_FIELD);
  const userAgentVersion = formatField(fieldConstants.USER_AGENT_VERSION_FIELD);

  return {
    [fieldConstants.TIMESTAMP_FIELD]: timestamp,
    [fieldConstants.PARENT_ID_FIELD]: parentId,
    [fieldConstants.HTTP_RESPONSE_STATUS_CODE_FIELD]: httpResponseStatusCode,
    [fieldConstants.TRACE_ID_FIELD]: traceId,
    [fieldConstants.SERVICE_NAME_FIELD]: serviceName,
    [fieldConstants.SERVICE_ENVIRONMENT_FIELD]: serviceEnvironment,
    [fieldConstants.AGENT_NAME_FIELD]: agentName,
    [fieldConstants.TRANSACTION_ID_FIELD]: transactionId,
    [fieldConstants.TRANSACTION_NAME_FIELD]: transactionName,
    [fieldConstants.TRANSACTION_DURATION_FIELD]: transactionDuration,
    [fieldConstants.SPAN_NAME_FIELD]: spanName,
    [fieldConstants.SPAN_ACTION_FIELD]: spanAction,
    [fieldConstants.SPAN_DURATION_FIELD]: spanDuration,
    [fieldConstants.SPAN_TYPE_FIELD]: spanType,
    [fieldConstants.SPAN_SUBTYPE_FIELD]: spanSubtype,
    [fieldConstants.SPAN_DESTINATION_SERVICE_RESOURCE_FIELD]: spanDestinationServiceResource,
    [fieldConstants.USER_AGENT_NAME_FIELD]: userAgentName,
    [fieldConstants.USER_AGENT_VERSION_FIELD]: userAgentVersion,
  };
}
