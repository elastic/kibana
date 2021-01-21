/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/**
 * config options opt into telemetry
 */
export const CONFIG_TELEMETRY = 'telemetry:optIn';

/**
 * config description for opting into telemetry
 */
export const getConfigTelemetryDesc = () => {
  // Can't find where it's used but copying it over from the legacy code just in case...
  return i18n.translate('telemetry.telemetryConfigDescription', {
    defaultMessage:
      'Help us improve the Elastic Stack by providing usage statistics for basic features. We will not share this data outside of Elastic.',
  });
};

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
 * The endpoint version when hitting the remote telemetry service
 */
export const ENDPOINT_VERSION = 'v2';
