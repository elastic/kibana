/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';

export const NO_INDEX_PATTERNS: DataView[] = [];
export const EMPTY_AAD_FIELDS: DataViewField[] = [];
export const ALERTS_FEATURE_ID = 'alerts';
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const BASE_RAC_ALERTS_API_PATH = '/internal/rac/alerts';
