define(function (require) {
  return function (start, end, interval, pattern) {

    if (end.isBefore(start)) {
      throw new Error('Start must begin before end.');
    }

    if (!~['hour', 'day', 'week', 'year'].indexOf(interval)) {
      throw new Error('Interval must be hour, day, week, or year.');
    }

    if (!pattern) {
      throw new Error('Pattern can not be empty.');
    }

    var data = [];
    while (start.isBefore(end)) {
      start.add(interval, '1');
      data.push(start.format(pattern));
    }
    return data;
  };
});
