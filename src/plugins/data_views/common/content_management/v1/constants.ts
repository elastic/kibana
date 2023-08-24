/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DATA_VIEW_SAVED_OBJECT_TYPE as DataViewSOType } from '../..';
export { DataViewSOType };

/**
 * Data view saved object version.
 */
export const LATEST_VERSION = 1;

export type DataViewContentType = typeof DataViewSOType;
