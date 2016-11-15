define(function (require) {

  return function ticketFormatters() {
    var formatters =  {
      'bits': function (val, axis) {
        var labels = ['b','kb','mb','gb','tb','pb'];
        var index = 0;
        while (val >= 1000 && index < labels.length) {
          val /= 1000;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bits/s': function (val, axis) {
        var labels = ['b/s','kb/s','mb/s','gb/s','tb/s','pb/s'];
        var index = 0;
        while (val >= 1000 && index < labels.length) {
          val /= 1000;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bytes': function (val, axis) {
        var labels = ['B','KB','MB','GB','TB','PB'];
        var index = 0;
        while (val >= 1024 && index < labels.length) {
          val /= 1024;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'bytes/s': function (val, axis) {
        var labels = ['B/s','KB/s','MB/s','GB/s','TB/s','PB/s'];
        var index = 0;
        while (val >= 1024 && index < labels.length) {
          val /= 1024;
          index++;
        }
        return (Math.round(val * 100) / 100) + labels[index];
      },
      'currency': function (val, axis) {
        return val.toLocaleString('en', { style: 'currency', currency: axis.options.units[1] });
      },
      'custom': function (val, axis) {
        var prefix = axis.options.units[1] || '';
        var suffix = axis.options.units[2] || '';
        return prefix + val + suffix;
      }
    };

    return formatters;
  };
});
