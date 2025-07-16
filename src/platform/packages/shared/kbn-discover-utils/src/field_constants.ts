/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fields constants
export const TIMESTAMP_FIELD = '@timestamp';
export const HOST_NAME_FIELD = 'host.name';
export const LOG_LEVEL_FIELD = 'log.level';
export const MESSAGE_FIELD = 'message';
export const ERROR_MESSAGE_FIELD = 'error.message';
export const EVENT_ORIGINAL_FIELD = 'event.original';
export const EVENT_OUTCOME_FIELD = 'event.outcome';
export const INDEX_FIELD = '_index';
export const EVENT_CATEGORY_FIELD = 'event.category';

// Trace fields
export const TRACE_ID_FIELD = 'trace.id';
export const PARENT_ID_FIELD = 'parent.id';
export const TRANSACTION_ID_FIELD = 'transaction.id';
export const TRANSACTION_TYPE_FIELD = 'transaction.type';
export const TRANSACTION_NAME_FIELD = 'transaction.name';
export const TRANSACTION_DURATION_FIELD = 'transaction.duration.us';
export const SPAN_NAME_FIELD = 'span.name';
export const SPAN_ID_FIELD = 'span.id';
export const SPAN_ACTION_FIELD = 'span.action';
export const SPAN_DURATION_FIELD = 'span.duration.us';
export const SPAN_TYPE_FIELD = 'span.type';
export const SPAN_SUBTYPE_FIELD = 'span.subtype';
export const SPAN_DESTINATION_SERVICE_RESOURCE_FIELD = 'span.destination.service.resource';
export const PROCESSOR_EVENT_FIELD = 'processor.event';
export const OTEL_SPAN_KIND = 'kind';
export const OTEL_DURATION = 'duration';

export const LOG_FILE_PATH_FIELD = 'log.file.path';
export const DATASTREAM_NAMESPACE_FIELD = 'data_stream.namespace';
export const DATASTREAM_DATASET_FIELD = 'data_stream.dataset';
export const DATASTREAM_TYPE_FIELD = 'data_stream.type';

// Resource Fields
export const AGENT_NAME_FIELD = 'agent.name';
export const CLOUD_PROVIDER_FIELD = 'cloud.provider';
export const CLOUD_REGION_FIELD = 'cloud.region';
export const CLOUD_AVAILABILITY_ZONE_FIELD = 'cloud.availability_zone';
export const CLOUD_PROJECT_ID_FIELD = 'cloud.project.id';
export const CLOUD_INSTANCE_ID_FIELD = 'cloud.instance.id';
export const SERVICE_NAME_FIELD = 'service.name';
export const SERVICE_ENVIRONMENT_FIELD = 'service.environment';
export const ORCHESTRATOR_CLUSTER_NAME_FIELD = 'orchestrator.cluster.name';
export const ORCHESTRATOR_CLUSTER_ID_FIELD = 'orchestrator.cluster.id';
export const ORCHESTRATOR_RESOURCE_ID_FIELD = 'orchestrator.resource.id';
export const ORCHESTRATOR_NAMESPACE_FIELD = 'orchestrator.namespace';
export const CONTAINER_NAME_FIELD = 'container.name';
export const CONTAINER_ID_FIELD = 'container.id';
export const USER_AGENT_NAME_FIELD = 'user_agent.name';
export const USER_AGENT_VERSION_FIELD = 'user_agent.version';
export const HTTP_RESPONSE_STATUS_CODE_FIELD = 'http.response.status_code';

// Degraded Docs
export const IGNORED_FIELD = '_ignored';
export const IGNORED_FIELD_VALUES_FIELD = 'ignored_field_values';
export const DEGRADED_DOCS_FIELDS = [IGNORED_FIELD, IGNORED_FIELD_VALUES_FIELD] as const;

// Error Stacktrace
export const ERROR_STACK_TRACE = 'error.stack_trace';
export const ERROR_EXCEPTION_STACKTRACE_ABS_PATH = 'error.exception.stacktrace.abs_path';
export const ERROR_LOG_STACKTRACE_ABS_PATH = 'error.log.stacktrace.abs_path';
