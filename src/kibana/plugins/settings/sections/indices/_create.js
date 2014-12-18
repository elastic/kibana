define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var errors = require('errors');

  require('directives/validate_index_name');

  require('routes')
  .when('/settings/indices/', {
    template: require('text!plugins/settings/sections/indices/_create.html')
  });

  require('modules').get('apps/settings')
  .controller('settingsIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config) {
    var notify = new Notifier();
    var MissingIndices = errors.IndexPatternMissingIndices;
    var refreshKibanaIndex = Private(require('plugins/settings/sections/indices/_refresh_kibana_index'));
    var intervals = indexPatterns.intervals;

    // this and child scopes will write pattern vars here
    var index = $scope.index = {
      // set in updateDefaultForPatternType()
      name: null,
      defaultName: null,

      isTimeBased: true,
      nameIsPattern: false,
      sampleCount: 5,
      nameIntervalOptions: intervals,

      fetchFieldsError: 'Loading'
    };

    index.nameInterval = _.find(index.nameIntervalOptions, { name: 'daily' });
    index.timeField = null;

    var updateSamples = function () {
      updateDefaultForPatternType();
      index.samples = null;
      index.existing = null;
      index.patternErrors = [];

      if (!index.nameInterval || !index.name) {
        return;
      }

      var pattern = mockIndexPattern(index);

      indexPatterns.mapper.getIndicesForIndexPattern(pattern)
      .then(function (existing) {
        var all = existing.all;
        var matches = existing.matches;
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
      index.dateFields = index.timeField = index.listUsed = null;
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

      return indexPatterns.mapper.clearCache(index.name)
      .then(function () {
        var pattern = mockIndexPattern(index);

        return indexPatterns.mapper.getFieldsForIndexPattern(pattern, true)
        .catch(function (err) {
          // TODO: we should probably display a message of some kind
          if (err instanceof MissingIndices) {
            index.fetchFieldsError = 'Unable to fetch mapping. Do you have indices matching the pattern?';
            return [];
          }

          throw err;
        });
      })
      .then(function (fields) {
        if (fields.length > 0) {
          index.fetchFieldsError = null;
          index.dateFields = fields.filter(function (field) {
            return field.type === 'date';
          });
        }
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
          if (!config.get('defaultIndex')) {
            config.set('defaultIndex', indexPattern.id);
          }
          indexPatterns.cache.clear(indexPattern.id);
          kbnUrl.change('/settings/indices/' + indexPattern.id);
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

    var updateDefaultForPatternType = function () {
      var newDefault = index.nameIsPattern
        ? '[logstash-]YYYY.MM.DD'
        : 'logstash-*';

      if (index.name === index.defaultName) {
        index.name = index.defaultName = newDefault;
      } else {
        index.defaultName = newDefault;
      }

      if (!index.nameIsPattern) {
        delete index.nameInterval;
        delete index.timeField;
      }
    };

    var mockIndexPattern = function (index) {
      // trick the mapper into thinking this is an indexPattern
      return {
        id: index.name,
        intervalName: index.nameInterval
      };
    };

    $scope.moreSamples = function (andUpdate) {
      index.sampleCount += 5;
      if (andUpdate) updateSamples();
    };

    $scope.$watchMulti([
      'index.name',
      'index.nameInterval'
    ], updateSamples);

    $scope.$watchMulti([
      'index.nameIsPattern',
      'index.isTimeBased'
    ], updateDefaultForPatternType);

    $scope.$watchMulti([
      'index.name',
      'index.isTimeBased',
      'index.nameInterval',
      'index.sampleCount'
    ], $scope.refreshFieldList);
  });
});