/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as settings from '@kbn/management-settings-ids';

export const SECURITY_PROJECT_SETTINGS = [
  settings.ML_ANOMALY_DETECTION_RESULTS_ENABLE_TIME_DEFAULTS_ID,
  settings.ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_TIME_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_DEFAULT_INDEX_ID,
  settings.SECURITY_SOLUTION_DEFAULT_THREAT_INDEX_ID,
  settings.SECURITY_SOLUTION_DEFAULT_ANOMALY_SCORE_ID,
  settings.SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID,
  settings.SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID,
  settings.SECURITY_SOLUTION_ENABLE_CCS_WARNING_ID,
  settings.SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID,
  settings.SECURITY_SOLUTION_NEWS_FEED_URL_ID,
  settings.SECURITY_SOLUTION_ENABLE_NEWS_FEED_ID,
  settings.SECURITY_SOLUTION_DEFAULT_ALERT_TAGS_KEY,
  settings.SECURITY_SOLUTION_ENABLE_EXPANDABLE_FLYOUT_SETTING,
];
