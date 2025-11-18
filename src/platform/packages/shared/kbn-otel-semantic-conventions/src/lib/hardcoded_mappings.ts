/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SemconvStructuredFieldDefinitions } from '../types/semconv_types';

/**
 * Hardcoded field mappings from the OpenTelemetry Dev repository mapping tables.
 * These represent the core OTLP to Elasticsearch field mappings that are not covered
 * by the semantic conventions YAML files.
 *
 * Sources:
 * - Field Names: Elasticsearch field mapping tables
 * - Descriptions: OpenTelemetry proto file comments
 * - Types: Elasticsearch component templates/mapping definitions
 */

/**
 * Logs data model mappings from logs.proto
 * Source: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/logs/v1/logs.proto
 */
const LOGS_MAPPINGS: SemconvStructuredFieldDefinitions = {
  '@timestamp': {
    name: '@timestamp',
    description: 'Time when the event occurred. UNIX Epoch time in nanoseconds.',
    type: 'date_nanos',
  },
  observed_timestamp: {
    name: 'observed_timestamp',
    description: 'Time when the event was observed by the collection system.',
    type: 'date_nanos',
  },
  severity_number: {
    name: 'severity_number',
    description: 'Numerical value of the severity.',
    type: 'long',
  },
  severity_text: {
    name: 'severity_text',
    description: 'The severity text (also known as log level).',
    type: 'keyword',
  },
  'body.text': {
    name: 'body.text',
    description: 'A value containing the body of the log record (text format).',
    type: 'match_only_text',
  },
  'body.structured': {
    name: 'body.structured',
    description: 'A value containing the body of the log record (structured format).',
    type: 'flattened',
  },
  dropped_attributes_count: {
    name: 'dropped_attributes_count',
    description: 'Number of attributes that were discarded due to limits.',
    type: 'long',
  },
  trace_id: {
    name: 'trace_id',
    description: 'A unique identifier for a trace.',
    type: 'keyword',
  },
  span_id: {
    name: 'span_id',
    description: 'A unique identifier for a span within a trace.',
    type: 'keyword',
  },
  event_name: {
    name: 'event_name',
    description: 'A unique identifier of event category/type.',
    type: 'keyword',
  },
  'scope.name': {
    name: 'scope.name',
    description: 'The name of the instrumentation scope.',
    type: 'keyword',
  },
  'scope.version': {
    name: 'scope.version',
    description: 'The version of the instrumentation scope.',
    type: 'keyword',
  },
  'scope.dropped_attributes_count': {
    name: 'scope.dropped_attributes_count',
    description: 'Number of scope attributes that were discarded due to limits.',
    type: 'long',
  },
  'scope.schema_url': {
    name: 'scope.schema_url',
    description: 'The Schema URL for the scope.',
    type: 'keyword',
  },
  'resource.dropped_attributes_count': {
    name: 'resource.dropped_attributes_count',
    description: 'Number of resource attributes that were discarded due to limits.',
    type: 'long',
  },
  'resource.schema_url': {
    name: 'resource.schema_url',
    description: 'The Schema URL for the resource.',
    type: 'keyword',
  },
};

/**
 * Metrics data model mappings from metrics.proto
 * Source: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/metrics/v1/metrics.proto
 */
const METRICS_MAPPINGS: SemconvStructuredFieldDefinitions = {
  start_timestamp: {
    name: 'start_timestamp',
    description: 'StartTimeUnixNano is the time when the cumulative metric was reset.',
    type: 'date_nanos',
  },
  unit: {
    name: 'unit',
    description: 'Unit in which the metric value is reported.',
    type: 'keyword',
  },
  'scope.name': {
    name: 'scope.name',
    description: 'The name of the instrumentation scope that produced the metric.',
    type: 'keyword',
  },
  'scope.version': {
    name: 'scope.version',
    description: 'The version of the instrumentation scope.',
    type: 'keyword',
  },
  'scope.dropped_attributes_count': {
    name: 'scope.dropped_attributes_count',
    description: 'Number of scope attributes that were discarded due to limits.',
    type: 'long',
  },
  'scope.schema_url': {
    name: 'scope.schema_url',
    description: 'The Schema URL for the scope.',
    type: 'keyword',
  },
  'resource.dropped_attributes_count': {
    name: 'resource.dropped_attributes_count',
    description: 'Number of resource attributes that were discarded due to limits.',
    type: 'long',
  },
  'resource.schema_url': {
    name: 'resource.schema_url',
    description: 'The Schema URL for the resource.',
    type: 'keyword',
  },
};

/**
 * Traces data model mappings from trace.proto
 * Source: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto
 */
const TRACES_MAPPINGS: SemconvStructuredFieldDefinitions = {
  trace_id: {
    name: 'trace_id',
    description: 'A unique identifier for a trace.',
    type: 'keyword',
  },
  span_id: {
    name: 'span_id',
    description: 'A unique identifier for a span within a trace.',
    type: 'keyword',
  },
  trace_state: {
    name: 'trace_state',
    description:
      'Tracestate represents tracing-system specific context in a list of key value pairs.',
    type: 'keyword',
  },
  parent_span_id: {
    name: 'parent_span_id',
    description: "The span_id of this span's parent span.",
    type: 'keyword',
  },
  name: {
    name: 'name',
    description: "A description of the span's operation.",
    type: 'keyword',
  },
  kind: {
    name: 'kind',
    description: 'Distinguishes between spans generated in a particular context.',
    type: 'keyword',
  },
  duration: {
    name: 'duration',
    description: 'Duration of the span in nanoseconds (end_time - start_time).',
    type: 'long',
  },
  dropped_attributes_count: {
    name: 'dropped_attributes_count',
    description: 'Number of attributes that were discarded due to limits.',
    type: 'long',
  },
  dropped_events_count: {
    name: 'dropped_events_count',
    description: 'Number of events that were discarded due to limits.',
    type: 'long',
  },
  links: {
    name: 'links',
    description: 'Links to other spans.',
    type: 'object',
  },
  'links.trace_id': {
    name: 'links.trace_id',
    description: "A unique identifier of the linked span's trace.",
    type: 'keyword',
  },
  'links.span_id': {
    name: 'links.span_id',
    description: 'A unique identifier for the linked span.',
    type: 'keyword',
  },
  'links.trace_state': {
    name: 'links.trace_state',
    description: 'Tracestate of the linked span.',
    type: 'keyword',
  },
  'links.attributes': {
    name: 'links.attributes',
    description: 'Additional link attributes.',
    type: 'object',
  },
  'links.dropped_attributes_count': {
    name: 'links.dropped_attributes_count',
    description: 'Number of link attributes that were discarded due to limits.',
    type: 'long',
  },
  dropped_links_count: {
    name: 'dropped_links_count',
    description: 'Number of links that were discarded due to limits.',
    type: 'long',
  },
  status: {
    name: 'status',
    description: 'An optional final status for the span.',
    type: 'object',
  },
  'status.message': {
    name: 'status.message',
    description: 'A developer-facing human readable error message.',
    type: 'keyword',
  },
  'status.code': {
    name: 'status.code',
    description: 'The status code.',
    type: 'keyword',
  },
  'scope.name': {
    name: 'scope.name',
    description: 'The name of the instrumentation scope that produced the span.',
    type: 'keyword',
  },
  'scope.version': {
    name: 'scope.version',
    description: 'The version of the instrumentation scope.',
    type: 'keyword',
  },
  'scope.dropped_attributes_count': {
    name: 'scope.dropped_attributes_count',
    description: 'Number of scope attributes that were discarded due to limits.',
    type: 'long',
  },
  'scope.schema_url': {
    name: 'scope.schema_url',
    description: 'The Schema URL for the scope.',
    type: 'keyword',
  },
  'resource.dropped_attributes_count': {
    name: 'resource.dropped_attributes_count',
    description: 'Number of resource attributes that were discarded due to limits.',
    type: 'long',
  },
  'resource.schema_url': {
    name: 'resource.schema_url',
    description: 'The Schema URL for the resource.',
    type: 'keyword',
  },
};

/**
 * Get all hardcoded field mappings from OTLP protocol definitions
 * These represent core telemetry structure fields that are not covered by semantic conventions
 */
export function getHardcodedMappings(): SemconvStructuredFieldDefinitions {
  return {
    ...LOGS_MAPPINGS,
    ...METRICS_MAPPINGS,
    ...TRACES_MAPPINGS,
  };
}
