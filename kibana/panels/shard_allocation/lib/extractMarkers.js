define(function (require) {
  'use strict';
  var _ = require('lodash');  
  var moment = require('moment');
  var getValue = require('./getValueFromArrayOrString');
  return function (data) {
    var total = 0;
    var previous = 0;
    var markers = _.reduce(data, function (memo, item) {
      var display;
      var timestamp = getValue(item.fields['@timestamp']);
      var time = moment.utc(timestamp).startOf('day').format('YYYY-MM-DD');
      var marker = _.find(memo, function (rec) {
        // return rec.time.isSame(time); 
        return rec.time === time; 
      });
      if (marker) {
        marker.count = ++total;
      } else {
        display = moment.utc(timestamp).startOf('day').format('M/D');
        marker = { count: ++total, time: time, display: display };
        memo.push(marker);
      }
      return memo;
    }, []); 

    // We need to set the count of the previous element to the current. So 
    // the timeline will render correctly.
    markers = _.map(markers, function (val) {
      var current = val.count;
      val.count = previous;
      previous = current;
      return val;
    });

    return markers;
  };
});
