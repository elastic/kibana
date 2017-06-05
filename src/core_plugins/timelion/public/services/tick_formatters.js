define(function () {

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

  return function ticketFormatters() {
    const formatters =  {
      'bits': function (val) {
        const labels = ['b','kb','mb','gb','tb','pb'];
        let index = 0;
        while (val >= 1000 && index < labels.length) {
          val /= 1000;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bits/s': function (val) {
        const labels = ['b/s','kb/s','mb/s','gb/s','tb/s','pb/s'];
        let index = 0;
        while (val >= 1000 && index < labels.length) {
          val /= 1000;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bytes': function (val) {
        const labels = ['B','KB','MB','GB','TB','PB'];
        let index = 0;
        while (val >= 1024 && index < labels.length) {
          val /= 1024;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bytes/s': function (val) {
        const labels = ['B/s','KB/s','MB/s','GB/s','TB/s','PB/s'];
        let index = 0;
        while (val >= 1024 && index < labels.length) {
          val /= 1024;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'currency': function (val, axis) {
        return val.toLocaleString('en', { style: 'currency', currency: axis.options.units.prefix || 'USD' });
      },
      'percent': function (val) {
        return val * 100 + '%';
      },
      'custom': function (val, axis) {
        const formattedVal = baseTickFormatter(val, axis);
        const prefix = axis.options.units.prefix;
        const suffix = axis.options.units.suffix;
        return prefix + formattedVal + suffix;
      }
    };

    return formatters;
  };
});
