/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The amount of time, in milliseconds, to wait between reports when enabled.
 * Currently 24 hours.
 */
export const REPORT_INTERVAL_MS = 86400000;

/**
 * Key for the localStorage service
 */
export const LOCALSTORAGE_KEY = 'telemetry.data';

/**
 * Link to Advanced Settings.
 */
export const PATH_TO_ADVANCED_SETTINGS = '/app/management/kibana/settings';

/**
 * Link to the Elastic Telemetry privacy statement.
 */
export const PRIVACY_STATEMENT_URL = `https://www.elastic.co/legal/privacy-statement`;

/**
 * The telemetry payload content encryption encoding
 */
export const PAYLOAD_CONTENT_ENCODING = 'aes256gcm';

/**
 * The endpoint version when hitting the remote telemetry service
 */
export const ENDPOINT_VERSION = 'v2';

/**
 * The staging telemetry endpoint for the remote telemetry service.
 */

export const ENDPOINT_STAGING = 'https://telemetry-staging.elastic.co/';

/**
 * The production telemetry endpoint for the remote telemetry service.
 */

export const ENDPOINT_PROD = 'https://telemetry.elastic.co/';

/**
 * The telemetry channels for the remote telemetry service.
 */
export const TELEMETRY_CHANNELS = {
  SNAPSHOT_CHANNEL: 'xpack',
  OPT_IN_STATUS_CHANNEL: 'opt_in_status',
};
