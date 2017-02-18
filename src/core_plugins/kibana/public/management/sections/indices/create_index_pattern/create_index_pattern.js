import _ from 'lodash';
import moment from 'moment';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
import RefreshKibanaIndex from 'plugins/kibana/management/sections/indices/_refresh_kibana_index';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import './index_pattern_forms/time_field_index_pattern_form';
import './index_pattern_forms/non_time_field_index_pattern_form';
import './index_pattern_forms/event_time_field_index_pattern_form';
import {
  getDefaultPatternForInterval,
  sendCreateIndexPatternRequest,
} from './index_pattern_configuration_services';
import template from './create_index_pattern.html';

uiRoutes
.when('/management/kibana/index/', {
  template
});

uiModules.get('apps/management')
.controller('managementIndicesCreate', function ($scope, kbnUrl, Private, Notifier, indexPatterns, es, config, Promise) {
  const notify = new Notifier();
  const refreshKibanaIndex = Private(RefreshKibanaIndex);
  const intervals = indexPatterns.intervals;
  let samplePromise;

  // this and child scopes will write pattern vars here
  const index = $scope.index = {
    name: config.get('indexPattern:placeholder'),
    isTimeBased: true,
    nameIsPattern: false,
    notExpandable: false,
    sampleCount: 5,
    fetchFieldsError: 'Loading',
    nameInterval: _.find(indexPatterns.intervals, { name: 'daily' }),
    timeField: null,
  };

  function fetchFieldList() {
    index.dateFields = index.timeField = index.listUsed = null;
    const useIndexList = index.isTimeBased && index.nameIsPattern;
    let fetchFieldsError;
    let dateFields;

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
      const pattern = mockIndexPattern(index);

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
    index.timeField = matchingTimeField ? matchingTimeField : defaultTimeField;
  }

  function updateFieldList(results) {
    index.fetchFieldsError = results.fetchFieldsError;
    index.dateFields = results.dateFields;
  }

  function resetIndex() {
    index.patternErrors = [];
    $scope.ctrl.samples = null;
    index.existing = null;
    index.fetchFieldsError = 'Loading';
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

    if (!index.nameInterval || !index.name) {
      return Promise.resolve();
    }

    const pattern = mockIndexPattern(index);

    return indexPatterns.mapper.getIndicesForIndexPattern(pattern)
      .catch(function (err) {
        if (err instanceof IndexPatternMissingIndices) return;
        notify.error(err);
      })
      .then(function (existing) {
        const all = _.get(existing, 'all', []);
        const matches = _.get(existing, 'matches', []);
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
        const radius = Math.round(index.sampleCount / 2);
        const samples = indexPatterns.intervals.toIndexList(index.name, index.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          patternErrors.push('Invalid pattern, interval does not create unique index names');
        } else {
          $scope.ctrl.samples = samples;
        }

        throw patternErrors;
      });
  }

  $scope.ctrl = {
    intervals: indexPatterns.intervals,
    samples: [],
  };

  $scope.tabs = [{
    id: 'TIME',
    name: 'Time-based',
  }, {
    id: 'NON_TIME',
    name: 'Non-time-based',
  }, {
    id: 'EVENT_TIME',
    name: 'Event-time-based (deprecated)',
  }];

  $scope.selectedTab = $scope.tabs[0];

  $scope.selectTab = tab => {
    $scope.selectedTab = tab;
  };

  $scope.createIndexPattern = function () {
    const id = index.name;
    const timeFieldName = index.isTimeBased ? index.timeField.name : undefined;
    // Only event-time-based index patterns set an intervalName.
    const intervalName = index.nameIsPattern && index.isTimeBased ? index.nameInterval.name : undefined;
    const notExpandable = $scope.canExpandIndices() ? index.notExpandable : undefined;

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
        return notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
      }

      notify.fatal(err);
    });
  };

  $scope.canExpandIndices = function () {
    // to maximize performance in the digest cycle, move from the least
    // expensive operation to most
    return index.isTimeBased && !index.nameIsPattern && _.includes(index.name, '*');
  };

  $scope.refreshFieldList = function () {
    const timeField = index.timeField;
    fetchFieldList().then(function (results) {
      if (timeField) {
        updateFieldListAndSetTimeField(results, timeField.name);
      } else {
        updateFieldList(results);
      }
    });
  };

  $scope.moreSamples = function (andUpdate) {
    index.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  $scope.$watchMulti([
    'index.isTimeBased',
    'index.nameIsPattern',
    'index.nameInterval.name'
  ], function (newVal, oldVal) {
    const isTimeBased = newVal[0];
    const nameIsPattern = newVal[1];
    const newDefaultPatterm = getDefaultPatternForInterval(newVal[2]);
    const oldDefault = getDefaultPatternForInterval(oldVal[2]);

    if (index.name === oldDefault) {
      index.name = newDefaultPatterm;
    }

    if (!isTimeBased) {
      index.nameIsPattern = false;
    }

    if (!nameIsPattern) {
      delete index.nameInterval;
      delete index.timeField;
    } else {
      index.nameInterval = index.nameInterval || indexPatterns.intervals.byName.days;
      index.name = index.name || getDefaultPatternForInterval(index.nameInterval);
    }
  });

  $scope.$watchMulti([
    'index.name',
    'index.nameInterval'
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
});
