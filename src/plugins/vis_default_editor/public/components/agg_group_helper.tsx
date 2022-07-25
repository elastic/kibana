/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findIndex, isEmpty } from 'lodash';
import type { IAggConfig } from '@kbn/data-plugin/public';
import type { Schema } from '@kbn/visualizations-plugin/public';

import { getSchemaByName } from '../schemas';
import type { AggsState } from './agg_group_state';

const isAggRemovable = (agg: IAggConfig, group: IAggConfig[], schemas: Schema[]) => {
  const schema = getSchemaByName(schemas, agg.schema);
  const metricCount = group.reduce(
    (count, aggregation: IAggConfig) => (aggregation.schema === agg.schema ? ++count : count),
    0
  );
  // make sure the the number of these aggs is above the min
  return metricCount > schema.min;
};

const getEnabledMetricAggsCount = (group: IAggConfig[]) => {
  return group.reduce(
    (count, aggregation: IAggConfig) =>
      aggregation.schema === 'metric' && aggregation.enabled ? ++count : count,
    0
  );
};

const calcAggIsTooLow = (
  agg: IAggConfig,
  aggIndex: number,
  group: IAggConfig[],
  schemas: Schema[]
) => {
  const schema = getSchemaByName(schemas, agg.schema);
  if (!schema.mustBeFirst) {
    return false;
  }

  const firstDifferentSchema = findIndex(group, (aggr: IAggConfig) => {
    return aggr.schema !== agg.schema;
  });

  if (firstDifferentSchema === -1) {
    return false;
  }

  return aggIndex > firstDifferentSchema;
};

function isInvalidAggsTouched(aggsState: AggsState) {
  const invalidAggs = Object.values(aggsState).filter((agg) => !agg.valid);

  if (isEmpty(invalidAggs)) {
    return false;
  }

  return invalidAggs.every((agg) => agg.touched);
}

export { isAggRemovable, calcAggIsTooLow, isInvalidAggsTouched, getEnabledMetricAggsCount };
