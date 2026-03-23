/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_ITEM_VERSION_V2 } from './v2/constants';

export { LENS_ITEM_VERSION_V1 } from './v1/constants';
export { LENS_ITEM_VERSION_V2 } from './v2/constants';

/**
 * Latest Lens CM Item Version
 */
export const LENS_ITEM_LATEST_VERSION = LENS_ITEM_VERSION_V2;
export type LENS_ITEM_LATEST_VERSION = typeof LENS_ITEM_LATEST_VERSION;

/**
 * Lens CM Item content type
 */
export const LENS_CONTENT_TYPE = 'lens';
export type LENS_CONTENT_TYPE = typeof LENS_CONTENT_TYPE;
