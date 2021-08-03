/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';

import type { Series, Metric } from '../../../../common/types';

export const getLastMetric = (series: Series) =>
  last(series.metrics.filter((s) => s.type !== 'series_agg')) as Metric;
