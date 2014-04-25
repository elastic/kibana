define(function (require) {
  'use strict';
  var _ = require('lodash');
  var moment = require('moment');
  var getValue = require('./getValueFromArrayOrString');

  function markerMaker(count, time, timestamp) {
    return {
      count: count,
      time: time,
      display: moment.utc(timestamp).startOf('day').format('MMM D')
    };
  }

  return function (data) {
    // data has to be sorted by time and may contain duplicates
    var total = 0;
    var currentMarker = null;
    var markers = _.reduce(data, function (memo, item) {
      var timestamp = getValue(item.fields['@timestamp']);
      var time = moment.utc(timestamp).startOf('day').format('YYYY-MM-DD');
      if (!currentMarker) {
        // first marker
        currentMarker = markerMaker(0, time, timestamp);
      }
      else if (currentMarker.time !== time) {
        memo.push(currentMarker);
        currentMarker = markerMaker(total, time, timestamp);
      }
      total++;
      return memo;
    }, []);

    if (currentMarker) {
      markers.push(currentMarker);
    }

    return markers;
  };
});
