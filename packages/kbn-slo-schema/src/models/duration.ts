/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { assertNever } from '@kbn/std';
import * as moment from 'moment';

enum DurationUnit {
  'Minute' = 'm',
  'Hour' = 'h',
  'Day' = 'd',
  'Week' = 'w',
  'Month' = 'M',
  'Quarter' = 'Q',
  'Year' = 'Y',
}

class Duration {
  constructor(public readonly value: number, public readonly unit: DurationUnit) {
    if (isNaN(value) || value <= 0) {
      throw new Error('invalid duration value');
    }
    if (!Object.values(DurationUnit).includes(unit as unknown as DurationUnit)) {
      throw new Error('invalid duration unit');
    }
  }

  add(other: Duration): Duration {
    const currentDurationMoment = moment.duration(this.value, toMomentUnitOfTime(this.unit));
    const otherDurationMoment = moment.duration(other.value, toMomentUnitOfTime(other.unit));

    return new Duration(
      currentDurationMoment.add(otherDurationMoment).asMinutes(),
      DurationUnit.Minute
    );
  }

  isShorterThan(other: Duration): boolean {
    const otherDurationMoment = moment.duration(other.value, toMomentUnitOfTime(other.unit));
    const currentDurationMoment = moment.duration(this.value, toMomentUnitOfTime(this.unit));
    return currentDurationMoment.asSeconds() < otherDurationMoment.asSeconds();
  }

  isLongerOrEqualThan(other: Duration): boolean {
    return !this.isShorterThan(other);
  }

  format(): string {
    return `${this.value}${this.unit}`;
  }
}

const toDurationUnit = (unit: string): DurationUnit => {
  switch (unit) {
    case 'm':
      return DurationUnit.Minute;
    case 'h':
      return DurationUnit.Hour;
    case 'd':
      return DurationUnit.Day;
    case 'w':
      return DurationUnit.Week;
    case 'M':
      return DurationUnit.Month;
    case 'Q':
      return DurationUnit.Quarter;
    case 'y':
      return DurationUnit.Year;
    default:
      throw new Error('invalid duration unit');
  }
};

const toMomentUnitOfTime = (unit: DurationUnit): moment.unitOfTime.Diff => {
  switch (unit) {
    case DurationUnit.Minute:
      return 'minutes';
    case DurationUnit.Hour:
      return 'hours';
    case DurationUnit.Day:
      return 'days';
    case DurationUnit.Week:
      return 'weeks';
    case DurationUnit.Month:
      return 'months';
    case DurationUnit.Quarter:
      return 'quarters';
    case DurationUnit.Year:
      return 'years';
    default:
      assertNever(unit);
  }
};

export { Duration, DurationUnit, toMomentUnitOfTime, toDurationUnit };
