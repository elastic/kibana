/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { DataTableRecord, DocumentOverview, fieldConstants, formatFieldValue } from '../..';

export function getDocumentOverview(
  doc: DataTableRecord,
  { dataView, fieldFormats }: { dataView: DataView; fieldFormats: FieldFormatsStart }
): DocumentOverview {
  const formatField = <T extends keyof DocumentOverview>(field: T) => {
    return (
      field in doc.flattened
        ? formatFieldValue(
            doc.flattened[field],
            doc.raw,
            fieldFormats,
            dataView,
            dataView.fields.getByName(field)
          )
        : undefined
    ) as DocumentOverview[T];
  };

  const levelArray = doc.flattened[fieldConstants.LOG_LEVEL_FIELD];
  const level =
    Array.isArray(levelArray) && levelArray.length ? levelArray[0].toLowerCase() : undefined;
  const messageArray = doc.flattened[fieldConstants.MESSAGE_FIELD];
  const message = Array.isArray(messageArray) && messageArray.length ? messageArray[0] : undefined;
  const errorMessageArray = doc.flattened[fieldConstants.ERROR_MESSAGE_FIELD];
  const errorMessage =
    Array.isArray(errorMessageArray) && errorMessageArray.length ? errorMessageArray[0] : undefined;
  const eventOriginalArray = doc.flattened[fieldConstants.EVENT_ORIGINAL_FIELD];
  const eventOriginal =
    Array.isArray(eventOriginalArray) && eventOriginalArray.length
      ? eventOriginalArray[0]
      : undefined;
  const timestamp = formatField(fieldConstants.TIMESTAMP_FIELD);

  // Service
  const serviceName = formatField(fieldConstants.SERVICE_NAME_FIELD);
  const traceId = formatField(fieldConstants.TRACE_ID_FIELD);

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

  return {
    [fieldConstants.LOG_LEVEL_FIELD]: level,
    [fieldConstants.TIMESTAMP_FIELD]: timestamp,
    [fieldConstants.MESSAGE_FIELD]: message,
    [fieldConstants.ERROR_MESSAGE_FIELD]: errorMessage,
    [fieldConstants.EVENT_ORIGINAL_FIELD]: eventOriginal,
    [fieldConstants.SERVICE_NAME_FIELD]: serviceName,
    [fieldConstants.TRACE_ID_FIELD]: traceId,
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
  };
}
