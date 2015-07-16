var moment = require('moment');
var _ = require('lodash');

function offsetTime (milliseconds, offset, reverse) {
  if (!offset.match(/[-+][0-9]+[msdwMy]/g)) {
    throw new Error ('Malformed `offset` at ' + offset);
  }
  var parts = offset.match(/[-+]|[0-9]+|[msdwMy]/g);

  var add = parts[0] === '+';
  add = reverse ? !add : add;

  var mode = add ? 'add' : 'subtract';

  var momentObj = moment(milliseconds)[mode](parts[1], parts[2]);
  return momentObj.valueOf();
};

module.exports = {
  request: function (request, args) {
    if (args[0]) {
      var rangeFilter = request.body.query.filtered.filter.range;
      var timeField = _.keys(request.body.query.filtered.filter.range)[0];

      rangeFilter[timeField].gte = offsetTime(rangeFilter[timeField].gte, args[0])
      rangeFilter[timeField].lte = offsetTime(rangeFilter[timeField].lte, args[0])

      request.body.aggs.series.date_histogram.extended_bounds.min = rangeFilter[timeField].gte;
      request.body.aggs.series.date_histogram.extended_bounds.max = rangeFilter[timeField].lte;

    } else {
      throw new Error ('`offset` requires an offset, eg -2w or +3M');
    }
    return request;
  },
  result: function (response, args) {
    if (args[0]) {
      response = _.map(response, function (point) {
        return [offsetTime(point[0], args[0], true), point[1]];
      })
    }
    return response;
  }
}