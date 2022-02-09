/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

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

export class AggNotSupportedError extends UIError {
  constructor(metricType: string) {
    super(
      i18n.translate('visTypeTimeseries.wrongAggregationErrorMessage', {
        defaultMessage:
          'The {metricType} aggregation is not supported for existing panel configuration.',
        values: { metricType },
      })
    );
  }
}

export class TimeFieldNotSpecifiedError extends UIError {
  constructor() {
    super(
      i18n.translate('visTypeTimeseries.errors.timeFieldNotSpecifiedError', {
        defaultMessage: 'Time field is required to visualize the data',
      })
    );
  }
}

export const filterCannotBeAppliedErrorMessage = i18n.translate(
  'visTypeTimeseries.filterCannotBeAppliedError',
  {
    defaultMessage: 'The "filter" cannot be applied with this configuration',
  }
);

export class FilterCannotBeAppliedError extends UIError {
  constructor() {
    super(filterCannotBeAppliedErrorMessage);
  }
}

export class PivotNotSelectedForTableError extends UIError {
  constructor() {
    super(
      i18n.translate('visTypeTimeseries.table.noResultsAvailableWithDescriptionMessage', {
        defaultMessage:
          'No results available. You must choose a group by field for this visualization.',
      })
    );
  }
}
