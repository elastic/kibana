/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Where the Elasticsearch exporter of an EDOT Collector stores OTel-native logs and spans
export const LOGS_INDEX = 'logs-generic.otel-default';
export const TRACES_INDEX = 'traces-generic.otel-default';

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
export const SEVERITY_INFO = 9;
export const SEVERITY_ERROR = 17;
export const SEVERITY_FATAL = 21;
