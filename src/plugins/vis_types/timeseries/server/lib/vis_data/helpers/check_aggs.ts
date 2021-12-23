/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { AggNotSupportedInMode } from '../../../../common/errors';
import { TIME_RANGE_DATA_MODES } from '../../../../common/enums';
import { DEFAULT_UI_RESTRICTION, RESTRICTIONS_KEYS } from '../../../../common/ui_restrictions';

import { Metric } from '../../../../common/types';
import { SearchCapabilities } from '../../search_strategies';

// @todo: will be removed in 8.1
// That logic was moved into common folder in that PR https://github.com/elastic/kibana/pull/119967
// isMetricEnabled method should be used instead. See check_ui_restrictions.ts file
const checkUIRestrictions = (key: string, restrictions: Record<string, unknown>, type: string) => {
  const isAllEnabled = get(restrictions ?? DEFAULT_UI_RESTRICTION, `${type}.*`, true);

  return isAllEnabled || Boolean(get(restrictions ?? DEFAULT_UI_RESTRICTION, [type, key], false));
};

export function isAggSupported(metrics: Metric[], capabilities: SearchCapabilities) {
  const metricTypes = metrics.filter(
    (metric) =>
      !checkUIRestrictions(
        metric.type,
        capabilities.uiRestrictions,
        RESTRICTIONS_KEYS.WHITE_LISTED_METRICS
      )
  );

  if (metricTypes.length) {
    throw new AggNotSupportedInMode(
      metricTypes.map((metric) => `"${metric.type}"`).join(', '),
      TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE
    );
  }
}
