/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
