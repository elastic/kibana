/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';

import type { LegacyAxis } from './panel_utils';

function baseTickFormatter(value: number, axis: LegacyAxis) {
  const factor = axis.tickDecimals ? Math.pow(10, axis.tickDecimals) : 1;
  const formatted = '' + Math.round(value * factor) / factor;

  // If tickDecimals was specified, ensure that we have exactly that
  // much precision; otherwise default to the value's own precision.

  if (axis.tickDecimals != null) {
    const decimal = formatted.indexOf('.');
    const precision = decimal === -1 ? 0 : formatted.length - decimal - 1;
    if (precision < axis.tickDecimals) {
      return (
        (precision ? formatted : formatted + '.') +
        ('' + factor).substr(1, axis.tickDecimals - precision)
      );
    }
  }

  return formatted;
}

function unitFormatter(divisor: number, units: string[]) {
  return (val: number) => {
    let index = 0;
    const isNegative = val < 0;
    val = Math.abs(val);
    while (val >= divisor && index < units.length) {
      val /= divisor;
      index++;
    }
    const value = (Math.round(val * 100) / 100) * (isNegative ? -1 : 1);
    return `${value}${units[index]}`;
  };
}

export function tickFormatters() {
  return {
    bits: unitFormatter(1000, ['b', 'kb', 'mb', 'gb', 'tb', 'pb']),
    'bits/s': unitFormatter(1000, ['b/s', 'kb/s', 'mb/s', 'gb/s', 'tb/s', 'pb/s']),
    bytes: unitFormatter(1024, ['B', 'KB', 'MB', 'GB', 'TB', 'PB']),
    'bytes/s': unitFormatter(1024, ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s']),
    currency(val: number, axis: LegacyAxis) {
      return val.toLocaleString('en', {
        style: 'currency',
        currency: (axis && axis.options && axis.options.units.prefix) || 'USD',
      });
    },
    percent(val: number, axis: LegacyAxis) {
      let precision =
        get(axis, 'tickDecimals', 0) - get(axis, 'options.units.tickDecimalsShift', 0);
      // toFixed only accepts values between 0 and 20
      if (precision < 0) {
        precision = 0;
      } else if (precision > 20) {
        precision = 20;
      }

      return (val * 100).toFixed(precision) + '%';
    },
    custom(val: number, axis: LegacyAxis) {
      const formattedVal = baseTickFormatter(val, axis);
      const prefix = axis && axis.options && axis.options.units.prefix;
      const suffix = axis && axis.options && axis.options.units.suffix;
      return prefix + formattedVal + suffix;
    },
  };
}
