define(function (require) {
  'use strict';
  var _ = require('lodash');
  var getValueFromArrayOrString = require('../lib/getValueFromArrayOrString');
  return function ($http, dashboard, filterSrv) {
    var getTimelineData = function (config, size, timeRange, data) {
      size = _.isUndefined(size) ? 300 : size;
      data = _.isUndefined(data) ? [] : data;
      timeRange = _.isUndefined(timeRange) ? filterSrv.timeRange(true) : timeRange;

      var url = config.elasticsearch+'/'+dashboard.indices.join(',')+'/cluster_state/_search';
      var body = {
        size: size,
        from: 0,
        fields: ['@timestamp', 'message', 'status'],
        sort: {
          '@timestamp': { order: 'desc' }
        },
        query: {
          filtered: {
            filter: {
              range: {
                '@timestamp': timeRange
              }
            }
          }
        }
      };

      return $http.post(url, body).then(function (resp) {
        var nextTimeRange;
        var hits = resp.data.hits;
        data.push.apply(data, hits.hits);
        if (hits.total > size && hits.hits.length === size) {
          nextTimeRange = {
            to: getValueFromArrayOrString(hits.hits[size-1].fields['@timestamp']),
            from: timeRange.from
          };
          return getTimelineData(config, size, nextTimeRange, data); // call again
        }
        // flip data back to normal order
        return data.reverse();
      });

    };

    return getTimelineData;
  };
    
});
