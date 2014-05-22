define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var errors = require('errors');

  require('routes').when('/settings/indices/', {
    template: require('text!../../partials/indices/create.html')
  });

  require('modules').get('app/settings')
  .controller('kbnSettingsIndicesCreate', function ($scope, $location, Notifier, Private, indexPatterns, es) {
    var notify = new Notifier();
    var refreshKibanaIndex = Private(require('./_refresh_kibana_index'));
    var MissingIndices = errors.IndexPatternMissingIndices;
    var intervals = indexPatterns.intervals;

    // this and child scopes will write pattern vars here
    var index = $scope.index = {
      // set in updateDefaultIndexName watcher
      name: null,
      defaultName: null,

      isTimeBased: false,
      nameIsPattern: false,
      sampleCount: 5,
      nameIntervalOptions: intervals
    };

    index.nameInterval = _.find(index.nameIntervalOptions, { name: 'daily' });
    index.timeField = _.find(index.nameIntervalOptions, { name: 'field' });

    var updateSamples = function () {
      index.samples = null;
      index.existing = null;
      index.patternErrors = [];

      if (!index.nameInterval || !index.name) {
        return;
      }

      // replace anything that is outside of brackets with a *
      var wildcard = indexPatterns.patternToWildcard(index.name);
      es.indices.getAliases({
        index: wildcard
      })
      .then(function (resp) {
        var all = Object.keys(resp);
        var matches = all.filter(function (existingIndex) {
          var parsed = moment(existingIndex, index.name);
          return existingIndex === parsed.format(index.name);
        });

        if (all.length) {
          index.existing = {
            class: all.length === matches.length ? 'success' : 'warning',
            all: all,
            matches: matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
          return;
        }

        index.patternErrors.push('Pattern does not match any existing indices');
        var radius = Math.round(index.sampleCount / 2);
        var samples = intervals.toIndexList(index.name, index.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          index.patternErrors.push('Invalid pattern, interval does not create unique index names');
        } else {
          index.samples = samples;
        }
      })
      .catch(notify.error);
    };

    $scope.refreshFieldList = function () {
      index.dateFields = index.timeField = index.fetchFieldsError = null;

      var useIndexList = index.isTimeBased && index.nameIsPattern;

      // we don't have enough info to continue
      if (!index.name) {
        index.fetchFieldsError = 'Set an index name first';
        return;
      }

      if (useIndexList && !index.nameInterval) {
        index.fetchFieldsError = 'Select the interval at which your indices are populated.';
        return;
      }

      indexPatterns.mapper.clearCache(index.name)
      .then(function () {
        var pattern = index.name;

        if (useIndexList) {
          // trick the mapper into thinking this is an indexPattern
          pattern = {
            id: index.name,
            toIndexList: function (to, from) {
              return intervals.toIndexList(index.name, index.nameInterval, to, from);
            }
          };
        }

        return indexPatterns.mapper.getFieldsForIndexPattern(pattern, true)
        .catch(function (err) {
          // TODO: we should probably display a message of some kind
          if (err instanceof MissingIndices) return [];
          throw err;
        });
      })
      .then(function (fields) {
        index.dateFields = fields.filter(function (field) {
          return field.type === 'date';
        });
      }, notify.fatal);
    };

    $scope.createIndexPattern = function () {
      // get an empty indexPattern to start
      indexPatterns.get()
      .then(function (indexPattern) {
        // set both the id and title to the index index
        indexPattern.id = indexPattern.title = index.name;
        if (index.isTimeBased) {
          indexPattern.timeFieldName = index.timeField.name;
          if (index.nameIsPattern) {
            indexPattern.intervalName = index.nameInterval.name;
          }
        }

        // fetch the fields
        return indexPattern.refreshFields()
        .then(refreshKibanaIndex)
        .then(function () {
          indexPatterns.cache.clear(indexPattern.id);
          $location.url('/settings/indices/' + indexPattern.id);
        });

        // refreshFields calls save() after a successfull fetch, no need to save again
        // .then(function () { indexPattern.save(); })
      })
      .catch(function (err) {
        if (err instanceof MissingIndices) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
        else notify.fatal(err);
      });
    };

    var updateDefaultIndexName = function () {
      var newDefault = index.nameIsPattern
        ? '[logstash-]YYYY.MM.DD'
        : 'logstash-*';

      if (index.name === index.defaultName) {
        index.name = index.defaultName = newDefault;
      } else {
        index.defaultName = newDefault;
      }
    };

    $scope.moreSamples = function (andUpdate) {
      index.sampleCount += 5;
      if (andUpdate) updateSamples();
    };

    $scope.$watch('index.name', updateSamples);
    $scope.$watch('index.name', $scope.refreshFieldList);
    $scope.$watch('index.isTimeBased', $scope.refreshFieldList);
    $scope.$watch('index.nameIsPattern', updateDefaultIndexName);
    $scope.$watch('index.nameIsPattern', $scope.refreshFieldList);
    $scope.$watch('index.nameInterval', updateSamples);
    $scope.$watch('index.nameInterval', $scope.refreshFieldList);
  });
});