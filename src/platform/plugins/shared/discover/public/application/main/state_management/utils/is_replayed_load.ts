/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalStateDataRequestParams } from '../redux';

/** A replayed load reuses a cached session and time range, fetching any missing responses from Elasticsearch. */
export const isReplayedLoad = ({
  replayCacheLastFetched,
}: Pick<InternalStateDataRequestParams, 'replayCacheLastFetched'>) =>
  replayCacheLastFetched !== undefined;
