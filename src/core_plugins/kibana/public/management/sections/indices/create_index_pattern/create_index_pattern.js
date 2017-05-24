import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_name';
import 'ui/directives/auto_select_if_only_one';
import { RefreshKibanaIndex } from '../refresh_kibana_index';
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
  const refreshKibanaIndex = Private(RefreshKibanaIndex);
  const intervals = indexPatterns.intervals;
  let samplePromise;

  // Configure the new index pattern we're going to create.
  this.formValues = {
    name: config.get('indexPattern:placeholder'),
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

  const TIME_FILTER_FIELD_OPTIONS = {
    NO_DATE_FIELD_DESIRED: {
      name: $translate.instant('KIBANA-NO_DATE_FIELD_DESIRED')
    },
    NO_DATE_FIELDS_IN_INDICES: {
      name: $translate.instant('KIBANA-NO_DATE_FIELDS_IN_INDICES')
    }
  };

  const fetchFieldList = () => {
    this.dateFields = null;
    this.formValues.timeField = null;
    let fetchFieldsError;
    let dateFields;

    const missingPattern = !this.formValues.name;
    const missingInterval = this.formValues.nameIsPattern && !this.formValues.nameInterval;
    if (missingPattern || missingInterval)  {
      return;
    }

    return indexPatterns.mapper.clearCache(this.formValues.name)
    .then(() => {
      const pattern = mockIndexPattern(this.formValues);

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
    if (this.fetchFieldsError) {
      return;
    }

    this.dateFields = results.dateFields || [];
    this.indexHasDateFields = this.dateFields.length > 0;
    const moreThanOneDateField = this.dateFields.length > 1;
    if (this.indexHasDateFields) {
      this.dateFields.unshift(TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELD_DESIRED);
    } else {
      this.dateFields.unshift(TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELDS_IN_INDICES);
    }

    if (!moreThanOneDateField) {
      // At this point the `dateFields` array contains the date fields and the "no selection"
      // option. When we have less than two date fields we choose the last option, which will
      // be the "no date fields available" option if there are zero date fields, or the only
      // date field if there is one.
      this.formValues.timeField = this.dateFields[this.dateFields.length - 1];
    }
  };

  const updateFieldListAndSetTimeField = (results, timeFieldName) => {
    updateFieldList(results);

    if (!results.dateFields.length) {
      return;
    }

    const matchingTimeField = results.dateFields.find(field => field.name === timeFieldName);

    //assign the field from the results-list
    //angular recreates a new timefield instance, each time the list is refreshed.
    //This ensures the selected field matches one of the instances in the list.
    if (matchingTimeField) {
      this.formValues.timeField = matchingTimeField;
    }
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

    if (!this.formValues.nameInterval || !this.formValues.name) {
      return Promise.resolve();
    }

    const pattern = mockIndexPattern(this.formValues);

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
            all,
            matches,
            matchPercent: Math.round((matches.length / all.length) * 100) + '%',
            failures: _.difference(all, matches)
          };
        }

        patternErrors.push($translate.instant('KIBANA-PATTERN_DOES_NOT_MATCH_EXIST_INDICES'));
        const radius = Math.round(this.sampleCount / 2);
        const samples = intervals.toIndexList(this.formValues.name, this.formValues.nameInterval, -radius, radius);

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
    return !this.formValues.nameIsPattern && _.includes(this.formValues.name, '*');
  };

  this.refreshFieldList = () => {
    const timeField = this.formValues.timeField;
    fetchFieldList().then(results => {
      if (timeField) {
        updateFieldListAndSetTimeField(results, timeField.name);
      } else {
        updateFieldList(results);
      }
    });
  };

  this.createIndexPattern = () => {
    const id = this.formValues.name;
    let timeFieldName;
    if ((this.formValues.timeField !== TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELD_DESIRED)
      && (this.formValues.timeField !== TIME_FILTER_FIELD_OPTIONS.NO_DATE_FIELDS_IN_INDICES)) {
      timeFieldName = this.formValues.timeField.name;
    }

    // Only event-time-based index patterns set an intervalName.
    const intervalName =
      this.formValues.nameIsPattern
      ? this.formValues.nameInterval.name
      : undefined;

    const notExpandable =
      !this.formValues.expandable && this.canExpandIndices()
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

      refreshKibanaIndex().then(() => {
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
    'controller.formValues.nameIsPattern',
    'controller.formValues.nameInterval.name'
  ], (newVal, oldVal) => {
    const nameIsPattern = newVal[0];
    const newDefault = getDefaultPatternForInterval(newVal[1]);
    const oldDefault = getDefaultPatternForInterval(oldVal[1]);

    if (this.formValues.name === oldDefault) {
      this.formValues.name = newDefault;
    }

    if (!nameIsPattern) {
      delete this.formValues.nameInterval;
      delete this.formValues.timeField;
    } else {
      this.formValues.nameInterval = this.formValues.nameInterval || intervals.byName.days;
      this.formValues.name = this.formValues.name || getDefaultPatternForInterval(this.formValues.nameInterval);
    }
  });

  this.moreSamples = andUpdate => {
    this.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  $scope.$watchMulti([
    'controller.formValues.name',
    'controller.formValues.nameInterval'
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
    'controller.sampleCount'
  ], () => {
    this.refreshFieldList();
  });
});
