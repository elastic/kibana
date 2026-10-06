/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTimeRange } from '@kbn/presentation-publishing-schemas';
/**
 * Pre 9.4 the time_range state was stored in a camelCased key called timeRange.
 * This transform out function ensures that this state is not dropped when loading from
 * a legacy stored state. This should only be used for embeddables that existed before 9.4.
 */
export declare const transformTimeRangeOut: <
  StoredStateType extends SerializedTimeRange & Record<string, unknown>
>(
  storedState: StoredStateType
) => StoredStateType;
