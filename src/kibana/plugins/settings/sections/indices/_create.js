define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var errors = require('errors');

  require('directives/validate_index_name');
  require('directives/auto_select_if_only_one');

  require('routes')
  .when('/settings/indices/', {
    template: require('text!plugins/settings/sections/indices/_create.html')
  });

  require('modules').get('apps/settings')
  .controller('settingsIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config, Promise) {
    var notify = new Notifier();
    var MissingIndices = errors.IndexPatternMissingIndices;
    var refreshKibanaIndex = Private(require('plugins/settings/sections/indices/_refresh_kibana_index'));
    var intervals = indexPatterns.intervals;
    var samplePromise;

    // this and child scopes will write pattern vars here
    var index = $scope.index = {
      name: 'logstash-*',

      isTimeBased: true,
      nameIsPattern: false,
      sampleCount: 5,
      nameIntervalOptions: intervals,

      fetchFieldsError: 'Loading'
    };

    index.nameInterval = _.find(index.nameIntervalOptions, { name: 'daily' });
    index.timeField = null;

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
          if (index.nameIsPattern) {
            indexPattern.intervalName = index.nameInterval.name;
          }
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
        if (err instanceof MissingIndices) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
        else notify.fatal(err);
      });
    };


    $scope.$watchMulti([
      'index.isTimeBased',
      'index.nameIsPattern',
      'index.nameInterval.name'
    ], function (newVal, oldVal) {
      var isTimeBased = newVal[0];
      var nameIsPattern = newVal[1];
      var newDefault = getPatternDefault(newVal[2]);
      var oldDefault = getPatternDefault(oldVal[2]);

      if (index.name === oldDefault) {
        index.name = newDefault;
      }

      if (!isTimeBased) {
        index.nameIsPattern = false;
      }

      if (!nameIsPattern) {
        delete index.nameInterval;
        delete index.timeField;
      } else {
        index.nameInterval = index.nameInterval || intervals.byName.days;
        index.name = index.name || getPatternDefault(index.nameInterval);
      }
    });

    $scope.moreSamples = function (andUpdate) {
      index.sampleCount += 5;
      if (andUpdate) updateSamples();
    };

    $scope.$watchMulti([
      'index.name',
      'index.nameInterval'
    ], function (newVal, oldVal) {
      var lastPromise;
      resetIndex();
      samplePromise = lastPromise = updateSamples()
      .then(function () {
        promiseMatch(lastPromise, function () {
          index.samples = null;
          index.patternErrors = [];
        });
      })
      .catch(function (errors) {
        promiseMatch(lastPromise, function () {
          index.existing = null;
          index.patternErrors = errors;
        });
      })
      .finally(function () {
        // prevent running when no change happened (ie, first watcher call)
        if (!_.isEqual(newVal, oldVal)) {
          fetchFieldList().then(function (results) {
            if (lastPromise === samplePromise) {
              updateFieldList(results);
              samplePromise = null;
            }
          });
        }
      });
    });

    $scope.$watchMulti([
      'index.isTimeBased',
      'index.sampleCount'
    ], $scope.refreshFieldList);

    function updateSamples() {
      var patternErrors = [];

      if (!index.nameInterval || !index.name) {
        return Promise.resolve();
      }

      var pattern = mockIndexPattern(index);

      return indexPatterns.mapper.getIndicesForIndexPattern(pattern)
      .catch(notify.error)
      .then(function (existing) {
        var all = existing.all;
        var matches = existing.matches;
        if (all.length) {
          index.existing = {
            class: 'success',
            all: all,
            matches: matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
          return;
        }

        patternErrors.push('Pattern does not match any existing indices');
        var radius = Math.round(index.sampleCount / 2);
        var samples = intervals.toIndexList(index.name, index.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          patternErrors.push('Invalid pattern, interval does not create unique index names');
        } else {
          index.samples = samples;
        }

        throw patternErrors;
      });
    }

    function fetchFieldList() {
      index.dateFields = index.timeField = index.listUsed = null;
      var useIndexList = index.isTimeBased && index.nameIsPattern;
      var fetchFieldsError;
      var dateFields;

      // we don't have enough info to continue
      if (!index.name) {
        fetchFieldsError = 'Set an index name first';
        return;
      }

      if (useIndexList && !index.nameInterval) {
        fetchFieldsError = 'Select the interval at which your indices are populated.';
        return;
      }

      return indexPatterns.mapper.clearCache(index.name)
      .then(function () {
        var pattern = mockIndexPattern(index);

        return indexPatterns.mapper.getFieldsForIndexPattern(pattern, true)
        .catch(function (err) {
          // TODO: we should probably display a message of some kind
          if (err instanceof MissingIndices) {
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

    function promiseMatch(lastPromise, cb) {
      if (lastPromise === samplePromise) {
        cb();
      } else if (samplePromise != null) {
        // haven't hit the last promise yet, reset index params
        resetIndex();
      }
    }

    function resetIndex() {
      index.patternErrors = [];
      index.samples = null;
      index.existing = null;
      index.fetchFieldsError = 'Loading';
    }

    function getPatternDefault(interval) {
      switch (interval) {
      case 'hours':
        return '[logstash-]YYYY.MM.DD.HH';
      case 'days':
        return '[logstash-]YYYY.MM.DD';
      case 'weeks':
        return '[logstash-]GGGG.WW';
      case 'months':
        return '[logstash-]YYYY.MM';
      case 'years':
        return '[logstash-]YYYY';
      default:
        return 'logstash-*';
      }
    }

    function mockIndexPattern(index) {
      // trick the mapper into thinking this is an indexPattern
      return {
        id: index.name,
        intervalName: index.nameInterval
      };
    }
  });
});
