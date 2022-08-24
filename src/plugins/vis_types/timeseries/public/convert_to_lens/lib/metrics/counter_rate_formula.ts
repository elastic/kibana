/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import type { Metric } from '../../../../common/types';
import { TimeScaleValue, isTimeScaleValue } from './metrics_helpers';

const buildMaxFormula = (selector: string) => {
  return `max(${selector})`;
};

const buildPickMaxPositiveFormula = (selector: string) => {
  return `pick_max(${selector}, 0)`;
};

const buildDifferencesFormula = (selector: string, shift?: TimeScaleValue) => {
  return `differences(${selector}${shift ? `, shift=${shift}` : ''})`;
};

export const buildCounterRateFormula = (metric: Metric, field: DataViewField) => {
  const maxFormula = buildMaxFormula(field.name);

  const unit = metric.unit && isTimeScaleValue(metric.unit) ? metric.unit : undefined;
  const diffOfMaxFormula = buildDifferencesFormula(maxFormula, unit);

  const counterRateFormula = buildPickMaxPositiveFormula(diffOfMaxFormula);
  return counterRateFormula;
};
