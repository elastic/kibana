define(function (require) {
  var moment = require('moment');
  
  return {
    toString: function (range, format) {
      if (!range.from) {
        return 'Before ' + moment(range.to).format(format);
      } else if (!range.to) {
        return 'After ' + moment(range.from).format(format);
      } else {
        return moment(range.from).format(format) + ' to ' + moment(range.to).format(format);
      }
    },
    parse: function (rangeString, format) {
      var chunks = rangeString.split(' to ');
      if (chunks.length === 2) return {from: moment(chunks[0], format), to: moment(chunks[1], format)};

      chunks = rangeString.split('Before ');
      if (chunks.length === 2) return {to: moment(chunks[1], format)};

      chunks = rangeString.split('After ');
      if (chunks.length === 2) return {from: moment(chunks[1], format)};

      throw new Error('Error attempting to parse date range: ' + rangeString);
    }
  };
});