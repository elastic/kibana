define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var { IndexPatternMissingIndices } = require('ui/errors');

  require('ui/directives/validate_index_name');
  require('ui/directives/auto_select_if_only_one');

  require('ui/routes')
  .when('/settings/indices/', {
    template: require('plugins/kibana/settings/sections/indices/_create.html')
  });

  require('ui/modules').get('apps/settings')
  .controller('settingsIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config, Promise) {
    var notify = new Notifier();
    var refreshKibanaIndex = Private(require('plugins/kibana/settings/sections/indices/_refresh_kibana_index'));

    // this and child scopes will write pattern vars here
    var index = $scope.index = {
      name: 'logstash-*',

      isTimeBased: true,
      timeField: null,

      fetchFieldsError: 'Loading'
    };

    $scope.refreshFieldList = function () {
      fetchFieldList().then(updateFieldList);
    };

    $scope.createIndexPattern = function () {
      // get an empty indexPattern to start
      indexPatterns.get()
      .then(function (indexPattern) {
        // set both the id and title to the index index
        indexPattern.id = indexPattern.title = index.name;
        if (index.isTimeBased) {
          indexPattern.timeFieldName = index.timeField.name;
        }

        // fetch the fields
        return indexPattern.create()
        .then(function (id) {
          if (id) {
            refreshKibanaIndex().then(function () {
              if (!config.get('defaultIndex')) {
                config.set('defaultIndex', indexPattern.id);
              }
              indexPatterns.cache.clear(indexPattern.id);
              kbnUrl.change('/settings/indices/' + indexPattern.id);
            });
          }
        });

        // refreshFields calls save() after a successfull fetch, no need to save again
        // .then(function () { indexPattern.save(); })
      })
      .catch(function (err) {
        if (err instanceof IndexPatternMissingIndices) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
        else notify.fatal(err);
      });
    };

    $scope.$watch('index.name', function (newVal, oldVal) {
      resetIndex();
      if (!_.isEqual(newVal, oldVal)) {
        fetchFieldList().then(updateFieldList);
      }
    });

    $scope.$watch('index.isTimeBased', $scope.refreshFieldList);

    function fetchFieldList() {
      index.dateFields = index.timeField = index.listUsed = null;
      var fetchFieldsError;
      var dateFields;

      // we don't have enough info to continue
      if (!index.name) {
        fetchFieldsError = 'Set an index name first';
        return Promise.reject(fetchFieldsError);
      }

      return indexPatterns.mapper.clearCache(index.name)
      .then(function () {
        var pattern = mockIndexPattern(index);

        return indexPatterns.mapper.getFieldsForIndexPattern(pattern, true)
        .catch(function (err) {
          // TODO: we should probably display a message of some kind
          if (err instanceof IndexPatternMissingIndices) {
            fetchFieldsError = 'Unable to fetch mapping. Do you have indices matching the pattern?';
            return [];
          }

          throw err;
        });
      })
      .then(function (fields) {
        if (fields.length > 0) {
          fetchFieldsError = null;
          dateFields = fields.filter(function (field) {
            return field.type === 'date';
          });
        }

        return {
          fetchFieldsError: fetchFieldsError,
          dateFields: dateFields
        };
      }, notify.fatal);
    }

    function updateFieldList(results) {
      index.fetchFieldsError = results.fetchFieldsError;
      index.dateFields = results.dateFields;
    }

    function resetIndex() {
      index.patternErrors = [];
      index.existing = null;
      index.fetchFieldsError = 'Loading';
    }

    function mockIndexPattern(index) {
      // trick the mapper into thinking this is an indexPattern
      return {
        id: index.name
      };
    }
  });
});
