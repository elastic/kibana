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
import { pickCreateButtonText } from './pick_create_button_text';

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
  let loadingCount = 0;

  // Configure the new index pattern we're going to create.
  this.formValues = {
    name: config.get('indexPattern:placeholder'),
    nameIsPattern: false,
    expandable: false,
    nameInterval: _.find(intervals, { name: 'daily' }),
    timeFieldOption: null,
  };

  // UI state.
  this.timeFieldOptions = null;
  this.sampleCount = 5;
  this.samples = null;
  this.existing = null;
  this.nameIntervalOptions = intervals;
  this.patternErrors = [];
  this.fetchFieldsError = null;

  const getTimeFieldOptions = () => {
    this.timeFieldOptions = null;
    this.formValues.timeFieldOption = null;

    const missingPattern = !this.formValues.name;
    const missingInterval = this.formValues.nameIsPattern && !this.formValues.nameInterval;
    if (missingPattern || missingInterval)  {
      return {
        timeFieldOptions: []
      };
    }

    loadingCount += 1;
    return indexPatterns.mapper.clearCache(this.formValues.name)
    .then(() => {
      const pattern = mockIndexPattern(this.formValues);

      return indexPatterns.mapper.getFieldsForIndexPattern(pattern, {
        skipIndexPatternCache: true,
      });
    })
    .then(
      fields => {
        const dateFields = fields.filter(field => field.type === 'date');

        if (dateFields.length === 0) {
          return {
            timeFieldOptions: [
              {
                display: $translate.instant('KIBANA-NO_DATE_FIELD_DESIRED')
              }
            ]
          };
        }

        return {
          timeFieldOptions: [
            {
              display: $translate.instant('KIBANA-NO_DATE_FIELDS_IN_INDICES')
            },
            ...fields.map(field => ({
              display: field.name,
              fieldName: field.name
            })),
          ]
        };
      },
      err => {
        if (err instanceof IndexPatternMissingIndices) {
          return {
            fetchFieldsError: $translate.instant('KIBANA-INDICES_MATCH_PATTERN'),
            timeFieldOptions: [],
          };
        }

        throw err;
      }
    )
    .finally(() => {
      loadingCount -= 1;
    })
    .catch(notify.fatal);
  };

  const updateFieldList = results => {
    this.fetchFieldsError = results.fetchFieldsError;
    if (this.fetchFieldsError) {
      return;
    }

    const actualFields = this.timeFieldOptions.filter(option => !!option.fieldName);
    this.indexHasDateFields = actualFields.length > 0;
    if (actualFields.length < 2) {
      // At this point the `timeFieldOptions` contains either 0 or 1 fields and potentially
      // non-field "informational" options. We select the last option as it will either be
      // the date field, an informational option if there are not date fields, or nothing.
      this.formValues.timeFieldOption = this.timeFieldOptions[this.timeFieldOptions.length - 1];
    }
  };

  const resetIndex = () => {
    this.patternErrors = [];
    this.samples = null;
    this.existing = null;
    this.fetchFieldsError = null;
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

    loadingCount += 1;
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
      })
      .finally(() => {
        loadingCount -= 1;
      });
  };

  this.canExpandIndices = () => {
    // to maximize performance in the digest cycle, move from the least
    // expensive operation to most
    return !this.formValues.nameIsPattern && _.includes(this.formValues.name, '*');
  };

  this.isLoading = () => {
    return loadingCount > 0;
  };

  this.refreshFieldList = () => {
    const prevOption = this.formValues.timeFieldOption;
    loadingCount += 1;
    getTimeFieldOptions().then(results => {
      updateFieldList(results);

      if (!prevOption) return;

      // assign the field from the results-list
      // angular recreates a new timefield instance, each time the list is refreshed.
      // This ensures the selected field matches one of the instances in the list.
      this.formValues.timeFieldOption = results.timeFieldOptions.find(option => (
        option.fieldName === prevOption.fieldName
          && option.display === prevOption.display
      ));
    }).finally(() => {
      loadingCount -= 1;
    });
  };

  this.createIndexPattern = () => {
    const {
      name,
      timeFieldOption,
      nameIsPattern,
      nameInterval,
      expandable
    } = this.formValues;

    const id = name;

    const fieldName = timeFieldOption && timeFieldOption.fieldName;

    // this seems wrong, but it's the original logic... https://git.io/vHYFo
    const notExpandable = (!expandable && this.canExpandIndices())
      ? true
      : undefined;

    // Only event-time-based index patterns set an intervalName.
    const intervalName = (nameIsPattern && nameInterval)
      ? nameInterval.name
      : undefined;

    loadingCount += 1;
    sendCreateIndexPatternRequest(indexPatterns, {
      id,
      fieldName,
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

        // force loading while kbnUrl.change takes effect
        loadingCount = Infinity;
      });
    }).catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return notify.error($translate.instant('KIBANA-NO_INDICES_MATCHING_PATTERN'));
      }

      notify.fatal(err);
    }).finally(() => {
      loadingCount -= 1;
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
      delete this.formValues.timeFieldOption;
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
        getTimeFieldOptions().then(results => {
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

  $scope.$watchMulti([
    'controller.isLoading()',
    'form.name.$error.indexNameInput',
    'controller.formValues.timeFieldOption'
  ], ([loading, invalidIndexName, timeFieldOption]) => {
    const state = { loading, invalidIndexName, timeFieldOption };
    this.createButtonText = pickCreateButtonText($translate, state);
  });
});
