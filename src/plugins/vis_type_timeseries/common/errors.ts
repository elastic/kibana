/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export class UIError extends Error {
  constructor(message: string) {
    super(message);
  }

  public get name() {
    return this.constructor.name;
  }

  public get errBody() {
    return this.message;
  }
}

export class FieldNotFoundError extends UIError {
  constructor(name: string) {
    super(
      i18n.translate('visTypeTimeseries.errors.fieldNotFound', {
        defaultMessage: `Field "{field}" not found`,
        values: { field: name },
      })
    );
  }
}

export class ValidateIntervalError extends UIError {
  constructor() {
    super(
      i18n.translate('visTypeTimeseries.errors.maxBucketsExceededErrorMessage', {
        defaultMessage:
          'Your query attempted to fetch too much data. Reducing the time range or changing the interval used usually fixes the issue.',
      })
    );
  }
}

export class AggNotSupportedInMode extends UIError {
  constructor(metricType: string, timeRangeMode: string) {
    super(
      i18n.translate('visTypeTimeseries.wrongAggregationErrorMessage', {
        defaultMessage:
          'The pipeline aggregation {metricType} is not longer supported in {timeRangeMode} mode',
        values: { metricType, timeRangeMode },
      })
    );
  }
}
