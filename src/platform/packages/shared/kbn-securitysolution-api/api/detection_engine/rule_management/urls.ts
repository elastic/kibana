/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INTERNAL_DETECTION_ENGINE_URL } from '../../../constants';

export const RULE_MANAGEMENT_FILTERS_URL = `${INTERNAL_DETECTION_ENGINE_URL}/rules/_rule_management_filters`;
export const RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL = `${INTERNAL_DETECTION_ENGINE_URL}/rules/_coverage_overview`;
