import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
import { RefreshKibanaIndex } from '../refresh_kibana_index';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import template from './create_index_pattern.html';
import { getDefaultPatternForInterval } from './get_default_pattern_for_interval';
import { sendCreateIndexPatternRequest } from './send_create_index_pattern_request';

uiRoutes
.when('/management/kibana/index', {
  template,
});

uiModules.get('apps/management')
.controller('managementIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config, Promise, $translate) {
  const notify = new Notifier();
  const refreshKibanaIndex = Private(RefreshKibanaIndex);
  const intervals = indexPatterns.intervals;
  let samplePromise;

  // Configure the new index pattern we're going to create.
  $scope.newIndexPattern = {
    name: config.get('indexPattern:placeholder'),
    isTimeBased: true,
    nameIsPattern: false,
    expandable: false,
    nameInterval: _.find(intervals, { name: 'daily' }),
    timeField: null,
  };

  // UI state.
  $scope.ctrl = {
    dateFields: null,
    sampleCount: 5,
    samples: null,
    existing: null,
    nameIntervalOptions: intervals,
    patternErrors: [],
    fetchFieldsError: $translate.instant('KIBANA-LOADING'),
  };

  function fetchFieldList() {
    $scope.ctrl.dateFields = $scope.newIndexPattern.timeField = null;
    const useIndexList = $scope.newIndexPattern.isTimeBased && $scope.newIndexPattern.nameIsPattern;
    let fetchFieldsError;
    let dateFields;

    // we don't have enough info to continue
    if (!$scope.newIndexPattern.name) {
      fetchFieldsError = $translate.instant('KIBANA-SET_INDEX_NAME_FIRST');
      return;
    }

    if (useIndexList && !$scope.newIndexPattern.nameInterval) {
      fetchFieldsError = $translate.instant('KIBANA-INTERVAL_INDICES_POPULATED');
      return;
    }

    return indexPatterns.mapper.clearCache($scope.newIndexPattern.name)
    .then(function () {
      const pattern = mockIndexPattern($scope.newIndexPattern);

      return indexPatterns.mapper.getFieldsForIndexPattern(pattern, {
        skipIndexPatternCache: true,
      })
      .catch(function (err) {
        // TODO: we should probably display a message of some kind
        if (err instanceof IndexPatternMissingIndices) {
          fetchFieldsError = $translate.instant('KIBANA-INDICES_MATCH_PATTERN');
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
        fetchFieldsError,
        dateFields,
      };
    }, notify.fatal);
  }

  function updateFieldListAndSetTimeField(results, timeFieldName) {
    updateFieldList(results);

    if (!results.dateFields.length) {
      return;
    }

    const matchingTimeField = results.dateFields.find(field => field.name === timeFieldName);
    const defaultTimeField = results.dateFields[0];

    //assign the field from the results-list
    //angular recreates a new timefield instance, each time the list is refreshed.
    //This ensures the selected field matches one of the instances in the list.
    $scope.newIndexPattern.timeField = matchingTimeField ? matchingTimeField : defaultTimeField;
  }

  function updateFieldList(results) {
    $scope.ctrl.fetchFieldsError = results.fetchFieldsError;
    $scope.ctrl.dateFields = results.dateFields;
  }

  function resetIndex() {
    $scope.ctrl.patternErrors = [];
    $scope.ctrl.samples = null;
    $scope.ctrl.existing = null;
    $scope.ctrl.fetchFieldsError = $translate.instant('KIBANA-LOADING');
  }

  function mockIndexPattern(index) {
    // trick the mapper into thinking this is an indexPattern
    return {
      id: index.name,
      intervalName: index.nameInterval
    };
  }

  function updateSamples() {
    const patternErrors = [];

    if (!$scope.newIndexPattern.nameInterval || !$scope.newIndexPattern.name) {
      return Promise.resolve();
    }

    const pattern = mockIndexPattern($scope.newIndexPattern);

    return indexPatterns.mapper.getIndicesForIndexPattern(pattern)
      .catch(function (err) {
        if (err instanceof IndexPatternMissingIndices) return;
        notify.error(err);
      })
      .then(function (existing) {
        const all = _.get(existing, 'all', []);
        const matches = _.get(existing, 'matches', []);

        if (all.length) {
          return $scope.ctrl.existing = {
            class: 'success',
            all,
            matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
        }

        patternErrors.push($translate.instant('KIBANA-PATTERN_DOES_NOT_MATCH_EXIST_INDICES'));
        const radius = Math.round($scope.ctrl.sampleCount / 2);
        const samples = intervals.toIndexList($scope.newIndexPattern.name, $scope.newIndexPattern.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          patternErrors.push($translate.instant('KIBANA-INVALID_NON_UNIQUE_INDEX_NAME_CREATED'));
        } else {
          $scope.ctrl.samples = samples;
        }

        throw patternErrors;
      });
  }

  $scope.canExpandIndices = function () {
    // to maximize performance in the digest cycle, move from the least
    // expensive operation to most
    return $scope.newIndexPattern.isTimeBased && !$scope.newIndexPattern.nameIsPattern && _.includes($scope.newIndexPattern.name, '*');
  };

  $scope.refreshFieldList = function () {
    const timeField = $scope.newIndexPattern.timeField;
    fetchFieldList().then(function (results) {
      if (timeField) {
        updateFieldListAndSetTimeField(results, timeField.name);
      } else {
        updateFieldList(results);
      }
    });
  };

  $scope.createIndexPattern = function () {
    const id = $scope.newIndexPattern.name;
    const timeFieldName =
      $scope.newIndexPattern.isTimeBased
      ? $scope.newIndexPattern.timeField.name
      : undefined;

    // Only event-time-based index patterns set an intervalName.
    const intervalName =
      $scope.newIndexPattern.isTimeBased  && $scope.newIndexPattern.nameIsPattern
      ? $scope.newIndexPattern.nameInterval.name
      : undefined;

    const notExpandable =
      !$scope.newIndexPattern.expandable && $scope.canExpandIndices()
      ? true
      : undefined;

    sendCreateIndexPatternRequest(indexPatterns, {
      id,
      timeFieldName,
      intervalName,
      notExpandable,
    }).then(createdId => {
      if (!createdId) {
        return;
      }

      refreshKibanaIndex().then(function () {
        if (!config.get('defaultIndex')) {
          config.set('defaultIndex', id);
        }

        indexPatterns.cache.clear(id);
        kbnUrl.change(`/management/kibana/indices/${id}`);
      });
    }).catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return notify.error($translate.instant('KIBANA-NO_INDICES_MATCHING_PATTERN'));
      }

      notify.fatal(err);
    });
  };

  $scope.$watchMulti([
    'newIndexPattern.isTimeBased',
    'newIndexPattern.nameIsPattern',
    'newIndexPattern.nameInterval.name'
  ], function (newVal, oldVal) {
    const isTimeBased = newVal[0];
    const nameIsPattern = newVal[1];
    const newDefault = getDefaultPatternForInterval(newVal[2]);
    const oldDefault = getDefaultPatternForInterval(oldVal[2]);

    if ($scope.newIndexPattern.name === oldDefault) {
      $scope.newIndexPattern.name = newDefault;
    }

    if (!isTimeBased) {
      $scope.newIndexPattern.nameIsPattern = false;
    }

    if (!nameIsPattern) {
      delete $scope.newIndexPattern.nameInterval;
      delete $scope.newIndexPattern.timeField;
    } else {
      $scope.newIndexPattern.nameInterval = $scope.newIndexPattern.nameInterval || intervals.byName.days;
      $scope.newIndexPattern.name = $scope.newIndexPattern.name || getDefaultPatternForInterval($scope.newIndexPattern.nameInterval);
    }
  });

  $scope.moreSamples = function (andUpdate) {
    $scope.ctrl.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  $scope.$watchMulti([
    'newIndexPattern.name',
    'newIndexPattern.nameInterval'
  ], function (newVal, oldVal) {
    function promiseMatch(lastPromise, cb) {
      if (lastPromise === samplePromise) {
        cb();
      } else if (samplePromise != null) {
        // haven't hit the last promise yet, reset index params
        resetIndex();
      }
    }

    let lastPromise;
    resetIndex();
    samplePromise = lastPromise = updateSamples()
    .then(function () {
      promiseMatch(lastPromise, function () {
        $scope.ctrl.samples = null;
        $scope.ctrl.patternErrors = [];
      });
    })
    .catch(function (errors) {
      promiseMatch(lastPromise, function () {
        $scope.ctrl.existing = null;
        $scope.ctrl.patternErrors = errors;
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
    'newIndexPattern.isTimeBased',
    'ctrl.sampleCount'
  ], $scope.refreshFieldList);
});
