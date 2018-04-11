import _ from 'lodash';

function baseTickFormatter(value, axis) {
  const factor = axis.tickDecimals ? Math.pow(10, axis.tickDecimals) : 1;
  const formatted = '' + Math.round(value * factor) / factor;

  // If tickDecimals was specified, ensure that we have exactly that
  // much precision; otherwise default to the value's own precision.

  if (axis.tickDecimals != null) {
    const decimal = formatted.indexOf('.');
    const precision = decimal === -1 ? 0 : formatted.length - decimal - 1;
    if (precision < axis.tickDecimals) {
      return (precision ? formatted : formatted + '.') + ('' + factor).substr(1, axis.tickDecimals - precision);
    }
  }

  return formatted;
}

function unitFormatter(divisor, units) {
  return (val) => {
    let index = 0;
    const isNegative = val < 0;
    val = Math.abs(val);
    while (val >= divisor && index < units.length) {
      val /= divisor;
      index++;
    }
    const value = Math.round(val * 100) / 100 * (isNegative ? -1 : 1);
    return `${value}${units[index]}`;
  };
}

export default function tickFormatters() {
  const formatters =  {
    'bits': unitFormatter(1000, ['b', 'kb', 'mb', 'gb', 'tb', 'pb']),
    'bits/s': unitFormatter(1000, ['b/s', 'kb/s', 'mb/s', 'gb/s', 'tb/s', 'pb/s']),
    'bytes': unitFormatter(1024, ['B', 'KB', 'MB', 'GB', 'TB', 'PB']),
    'bytes/s': unitFormatter(1024, ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s']),
    'currency': function (val, axis) {
      return val.toLocaleString('en', { style: 'currency', currency: axis.options.units.prefix || 'USD' });
    },
    'percent': function (val, axis) {
      let precision = _.get(axis, 'tickDecimals', 0) - _.get(axis, 'options.units.tickDecimalsShift', 0);
      // toFixed only accepts values between 0 and 20
      if (precision < 0) {
        precision = 0;
      } else if (precision > 20) {
        precision = 20;
      }

      return (val * 100).toFixed(precision) + '%';
    },
    'custom': function (val, axis) {
      const formattedVal = baseTickFormatter(val, axis);
      const prefix = axis.options.units.prefix;
      const suffix = axis.options.units.suffix;
      return prefix + formattedVal + suffix;
    }
  };

  return formatters;
}
