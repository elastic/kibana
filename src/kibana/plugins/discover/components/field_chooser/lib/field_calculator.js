define(function (require) {
  var _ = require('lodash');

  var getFieldValues = function (data, field) {
    var name = field.name;

    return _.map(data, function (row) {
      return row.$$_flattened[name] == null ? row[name] : row.$$_flattened[name];
    });
  };

  var getFieldValueCounts = function (params) {
    params = _.defaults(params, {
      count: 5,
      grouped: false
    });

    if (
      params.field.type === 'geo_point'
      || params.field.type === 'geo_shape'
      || params.field.type === 'attachment'
    ) {
      return { error: 'Analysis is not available for geo fields.' };
    }

    var allValues = getFieldValues(params.data, params.field),
      exists = 0,
      counts;

    var missing = _countMissing(allValues);

    try {
      var groups = _groupValues(allValues, params);
      counts = _.map(
        _.sortBy(groups, 'count').reverse().slice(0, params.count),
        function (bucket) {
          return {
            value: bucket.value,
            count: bucket.count,
            percent: (bucket.count / (params.data.length - missing) * 100).toFixed(1)
          };
        });

      if (params.data.length - missing === 0) {
        return {
          error: 'This field is present in your elasticsearch mapping' +
            ' but not in any documents in the search results.' +
            ' You may still be able to visualize or search on it.'
        };
      }

      return {
        total: params.data.length,
        exists: params.data.length - missing,
        missing: missing,
        buckets: counts,
      };
    } catch (e) {
      return { error: e.message };
    }

  };

  // returns a count of fields in the array that are undefined or null
  var _countMissing = function (array) {
    return array.length - _.without(array, undefined, null).length;
  };


  var _groupValues = function (allValues, params) {
    var groups = {},
    value, k;

    for (var i = 0; i < allValues.length; ++i) {

      value = allValues[i];

      if (_.isObject(value) && !_.isArray(value)) {
        throw new Error('Analysis is not available for object fields');
      }

      if (_.isArray(value) && !params.grouped) {
        k = value;
      } else {
        k = _.isUndefined(value) || _.isNull(value) ? undefined : [value.toString()];
      }

      /* jshint -W083 */
      _.each(k, function (key) {
        if (_.has(groups, key)) {
          groups[key].count++;
        } else {
          groups[key] = {
            value: (params.grouped ? value : key),
            count: 1
          };
        }
      });
    }
    return groups;
  };

  return {
    _groupValues: _groupValues,
    _countMissing: _countMissing,
    getFieldValues: getFieldValues,
    getFieldValueCounts: getFieldValueCounts
  };
});