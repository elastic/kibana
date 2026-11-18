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
// EDOT Browser data has a dataset of its own (elastic/observability-dev#6361), so that its index can
// be sorted by session without slowing the queries of the shared `generic` data streams
export const BROWSER_LOGS_INDEX = 'logs-browser.otel-default';
export const BROWSER_TRACES_INDEX = 'traces-browser.otel-default';
// Session replay of EDOT Browser has a data stream of its own: the dataset is `rum.replay`, to which
// the exporter appends `.otel`
export const REPLAY_INDEX = 'logs-rum.replay.otel-default';

// https://opentelemetry.io/docs/specs/otel/logs/data-model/#field-severitynumber
export const SEVERITY_INFO = 9;
export const SEVERITY_WARN = 13;
export const SEVERITY_ERROR = 17;
export const SEVERITY_FATAL = 21;

// The OpenTelemetry semantic conventions event of an app crash
export const EVENT_APP_CRASH = 'app.crash';
