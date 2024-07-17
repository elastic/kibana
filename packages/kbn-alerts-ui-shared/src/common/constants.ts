/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export const ALERTS_FEATURE_ID = 'alerts';
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting';
export const BASE_RAC_ALERTS_API_PATH = '/internal/rac/alerts';
export const EMPTY_AAD_FIELDS: DataViewField[] = [];
export const BASE_TRIGGERS_ACTIONS_UI_API_PATH = '/internal/triggers_actions_ui';
