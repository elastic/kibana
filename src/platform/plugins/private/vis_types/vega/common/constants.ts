/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';

/** Frozen as part of the Dashboard REST API (`panels[].type`). */
export const VEGA_EMBEDDABLE_TYPE = 'vega';

export const VEGA_SAVED_OBJECT_TYPE = 'vega';

export const VEGA_API_PATH = '/api/vega';

export const VEGA_API_VERSION = '2023-10-31';

export const VEGA_SUPPORTED_TRIGGERS = [ON_APPLY_FILTER, ON_OPEN_PANEL_MENU];

/** The most filters a library item or a panel can store. */
export const VEGA_MAX_FILTERS = 100;
