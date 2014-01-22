define([
  'angular',
  'underscore'
],
  function(ng, _) {
    ng.module('kibana.services').service('countTransform', function(dataTransform) {
      this.transform = function(hits, countBy, keepFields) {
        var hitDict = {},
          keepFields = keepFields || [];

        _.forEach(hits, function(hit) {
          var key = dataTransform.getField(hit, countBy);

          if (key in hitDict) {
            ++hitDict[key].count;
          } else {
            hitDict[key] = {
              'count': 1
            };
          }

          recordFields(hit, keepFields, hitDict[key]);
        });

        hits = [];
        _.forEach(hitDict, function(data, key) {
          var hit = {
            _source: {
              count: data.count
            }
          };
          hit._source[countBy] = key;
          explodeFields(hit, data, keepFields);

          hits.push(hit)
        });

        dataTransform.sort(hits, function(obj) {
          return obj._source.count;
        });

        return hits;
      };

      var recordFields = function(hit, fields, obj) {
        _.forEach(fields, function(field) {
          var value = dataTransform.getField(hit, field);
          if (value == null) {
            return;
          }

          if (!(field in obj)) {
            obj[field] = {};
          }

          if (!(value in obj[field])) {
            obj[field][value] = 0;
          }

          ++obj[field][value];
        });
      };

      var explodeFields = function(hit, data, fields) {
        _.forEach(fields, function(field) {
          if (!data[field]) {
            return;
          }

          var fieldData = [];
          _.forEach(data[field], function(count, key) {
            fieldData.push({
              key: key,
              count: count
            });
          });

          dataTransform.sort(fieldData, function(obj) {
            return obj.count;
          });

          hit._source[field] = dataTransform.objectListToString(fieldData, function(obj) {
            return [obj.key, obj.count];
          });
        });
      };
    });
  }
);