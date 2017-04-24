import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
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
  const intervals = indexPatterns.intervals;
  let samplePromise;

  // Configure the new index pattern we're going to create.
  this.newIndexPattern = {
    name: config.get('indexPattern:placeholder'),
    isTimeBased: true,
    nameIsPattern: false,
    expandable: false,
    nameInterval: _.find(intervals, { name: 'daily' }),
    timeField: null,
  };

  // UI state.
  this.dateFields = null;
  this.sampleCount = 5;
  this.samples = null;
  this.existing = null;
  this.nameIntervalOptions = intervals;
  this.patternErrors = [];
  this.fetchFieldsError = $translate.instant('KIBANA-LOADING');

  const fetchFieldList = () => {
    this.dateFields = this.newIndexPattern.timeField = null;
    const useIndexList = this.newIndexPattern.isTimeBased && this.newIndexPattern.nameIsPattern;
    let fetchFieldsError;
    let dateFields;

    // we don't have enough info to continue
    if (!this.newIndexPattern.name) {
      fetchFieldsError = $translate.instant('KIBANA-SET_INDEX_NAME_FIRST');
      return;
    }

    if (useIndexList && !this.newIndexPattern.nameInterval) {
      fetchFieldsError = $translate.instant('KIBANA-INTERVAL_INDICES_POPULATED');
      return;
    }

    return indexPatterns.mapper.clearCache(this.newIndexPattern.name)
    .then(() => {
      const pattern = mockIndexPattern(this.newIndexPattern);

      return indexPatterns.mapper.getFieldsForIndexPattern(pattern, {
        skipIndexPatternCache: true,
      })
      .catch((err) => {
        // TODO: we should probably display a message of some kind
        if (err instanceof IndexPatternMissingIndices) {
          fetchFieldsError = $translate.instant('KIBANA-INDICES_MATCH_PATTERN');
          return [];
        }

        throw err;
      });
    })
    .then(fields => {
      if (fields.length > 0) {
        fetchFieldsError = null;
        dateFields = fields.filter(field => field.type === 'date');
      }

      return {
        fetchFieldsError,
        dateFields,
      };
    }, notify.fatal);
  };

  const updateFieldList = results => {
    this.fetchFieldsError = results.fetchFieldsError;
    this.dateFields = results.dateFields;
  };

  const updateFieldListAndSetTimeField = (results, timeFieldName) => {
    updateFieldList(results);

    if (!results.dateFields.length) {
      return;
    }

    const matchingTimeField = results.dateFields.find(field => field.name === timeFieldName);
    const defaultTimeField = results.dateFields[0];

    //assign the field from the results-list
    //angular recreates a new timefield instance, each time the list is refreshed.
    //This ensures the selected field matches one of the instances in the list.
    this.newIndexPattern.timeField = matchingTimeField ? matchingTimeField : defaultTimeField;
  };

  const resetIndex = () => {
    this.patternErrors = [];
    this.samples = null;
    this.existing = null;
    this.fetchFieldsError = $translate.instant('KIBANA-LOADING');
  };

  function mockIndexPattern(index) {
    // trick the mapper into thinking this is an indexPattern
    return {
      id: index.name,
      intervalName: index.nameInterval
    };
  }

  const updateSamples = () => {
    const patternErrors = [];

    if (!this.newIndexPattern.nameInterval || !this.newIndexPattern.name) {
      return Promise.resolve();
    }

    const pattern = mockIndexPattern(this.newIndexPattern);

    return indexPatterns.mapper.getIndicesForIndexPattern(pattern)
      .catch(err => {
        if (err instanceof IndexPatternMissingIndices) return;
        notify.error(err);
      })
      .then(existing => {
        const all = _.get(existing, 'all', []);
        const matches = _.get(existing, 'matches', []);

        if (all.length) {
          return this.existing = {
            class: 'success',
            all,
            matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
        }

        patternErrors.push($translate.instant('KIBANA-PATTERN_DOES_NOT_MATCH_EXIST_INDICES'));
        const radius = Math.round(this.sampleCount / 2);
        const samples = intervals.toIndexList(this.newIndexPattern.name, this.newIndexPattern.nameInterval, -radius, radius);

        if (_.uniq(samples).length !== samples.length) {
          patternErrors.push($translate.instant('KIBANA-INVALID_NON_UNIQUE_INDEX_NAME_CREATED'));
        } else {
          this.samples = samples;
        }

        throw patternErrors;
      });
  };

  this.canExpandIndices = () => {
    // to maximize performance in the digest cycle, move from the least
    // expensive operation to most
    return this.newIndexPattern.isTimeBased && !this.newIndexPattern.nameIsPattern && _.includes(this.newIndexPattern.name, '*');
  };

  this.refreshFieldList = () => {
    const timeField = this.newIndexPattern.timeField;
    fetchFieldList().then(results => {
      if (timeField) {
        updateFieldListAndSetTimeField(results, timeField.name);
      } else {
        updateFieldList(results);
      }
    });
  };

  this.createIndexPattern = () => {
    const id = this.newIndexPattern.name;
    const timeFieldName =
      this.newIndexPattern.isTimeBased
      ? this.newIndexPattern.timeField.name
      : undefined;

    // Only event-time-based index patterns set an intervalName.
    const intervalName =
      this.newIndexPattern.isTimeBased  && this.newIndexPattern.nameIsPattern
      ? this.newIndexPattern.nameInterval.name
      : undefined;

    const notExpandable =
      !this.newIndexPattern.expandable && this.canExpandIndices()
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

      if (!config.get('defaultIndex')) {
        config.set('defaultIndex', id);
      }

      indexPatterns.cache.clear(id);
      kbnUrl.change(`/management/kibana/indices/${id}`);
    }).catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return notify.error($translate.instant('KIBANA-NO_INDICES_MATCHING_PATTERN'));
      }

      notify.fatal(err);
    });
  };

  $scope.$watchMulti([
    'controller.newIndexPattern.isTimeBased',
    'controller.newIndexPattern.nameIsPattern',
    'controller.newIndexPattern.nameInterval.name'
  ], (newVal, oldVal) => {
    const isTimeBased = newVal[0];
    const nameIsPattern = newVal[1];
    const newDefault = getDefaultPatternForInterval(newVal[2]);
    const oldDefault = getDefaultPatternForInterval(oldVal[2]);

    if (this.newIndexPattern.name === oldDefault) {
      this.newIndexPattern.name = newDefault;
    }

    if (!isTimeBased) {
      this.newIndexPattern.nameIsPattern = false;
    }

    if (!nameIsPattern) {
      delete this.newIndexPattern.nameInterval;
      delete this.newIndexPattern.timeField;
    } else {
      this.newIndexPattern.nameInterval = this.newIndexPattern.nameInterval || intervals.byName.days;
      this.newIndexPattern.name = this.newIndexPattern.name || getDefaultPatternForInterval(this.newIndexPattern.nameInterval);
    }
  });

  this.moreSamples = andUpdate => {
    this.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  $scope.$watchMulti([
    'controller.newIndexPattern.name',
    'controller.newIndexPattern.nameInterval'
  ], (newVal, oldVal) => {
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
    .then(() => {
      promiseMatch(lastPromise, () => {
        this.samples = null;
        this.patternErrors = [];
      });
    })
    .catch(errors => {
      promiseMatch(lastPromise, () => {
        this.existing = null;
        this.patternErrors = errors;
      });
    })
    .finally(() => {
      // prevent running when no change happened (ie, first watcher call)
      if (!_.isEqual(newVal, oldVal)) {
        fetchFieldList().then(results => {
          if (lastPromise === samplePromise) {
            updateFieldList(results);
            samplePromise = null;
          }
        });
      }
    });
  });

  $scope.$watchMulti([
    'controller.newIndexPattern.isTimeBased',
    'controller.sampleCount'
  ], () => {
    this.refreshFieldList();
  });
});
