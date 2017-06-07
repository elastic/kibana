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
  let loadingCount = 0;

  // Configure the new index pattern we're going to create.
  this.formValues = {
    name: config.get('indexPattern:placeholder'),
    nameIsPattern: false,
    expandWildcard: false,
    nameInterval: _.find(intervals, { name: 'daily' }),
    timeFieldOption: null,
  };

  // UI state.
  this.timeFieldOptions = [];
  this.timeFieldOptionsError = null;
  this.sampleCount = 5;
  this.samples = null;
  this.existing = null;
  this.nameIntervalOptions = intervals;
  this.patternErrors = [];

  const getTimeFieldOptions = () => {
    loadingCount += 1;
    return Promise.resolve()
    .then(() => {
      const { nameIsPattern, name } = this.formValues;

      if (!name) {
        return [];
      }

      if (nameIsPattern) {
        return indexPatterns.fieldsFetcher.fetchForTimePattern(name);
      }

      return indexPatterns.fieldsFetcher.fetchForWildcard(name);
    })
    .then(fields => {
      const dateFields = fields.filter(field => field.type === 'date');

      if (dateFields.length === 0) {
        return {
          options: [
            {
              display: $translate.instant('KIBANA-INDICES_DONT_CONTAIN_TIME_FIELDS')
            }
          ]
        };
      }

      return {
        options: [
          {
            display: $translate.instant('KIBANA-NO_DATE_FIELD_DESIRED')
          },
          ...dateFields.map(field => ({
            display: field.name,
            fieldName: field.name
          })),
        ]
      };
    })
    .catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        return {
          error: $translate.instant('KIBANA-INDICES_MATCH_PATTERN')
        };
      }

      throw err;
    })
    .finally(() => {
      loadingCount -= 1;
    });
  };

  const findTimeFieldOption = match => {
    if (!match) return;

    return this.timeFieldOptions.find(option => (
      // comparison is not done with _.isEqual() because options get a unique
      // `$$hashKey` tag attached to them by ng-repeat
      option.fieldName === match.fieldName &&
        option.display === match.display
    ));
  };

  const pickDefaultTimeFieldOption = () => {
    const noOptions = this.timeFieldOptions.length === 0;
    // options that represent a time field
    const fieldOptions = this.timeFieldOptions.filter(option => !!option.fieldName);
    // options like "I don't want the time filter" or "There are no date fields"
    const nonFieldOptions = this.timeFieldOptions.filter(option => !option.fieldName);
    // if there are multiple field or non-field options then we can't select a default, the user must choose
    const tooManyOptions = fieldOptions.length > 1 || nonFieldOptions.length > 1;

    if (noOptions || tooManyOptions) {
      return null;
    }

    if (fieldOptions.length === 1) {
      return fieldOptions[0];
    }

    return nonFieldOptions[0];
  };

  const resetIndex = () => {
    this.patternErrors = [];
    this.samples = null;
    this.existing = null;
  };

  const updateSamples = () => {
    const patternErrors = [];

    if (!this.formValues.nameInterval || !this.formValues.name) {
      return Promise.resolve();
    }

    loadingCount += 1;
    return indexPatterns.fieldsFetcher.testTimePattern(this.formValues.name)
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

  this.isTimeBased = () => {
    if (!this.formValues.timeFieldOption) {
      // if they haven't choosen a time field, assume they will
      return true;
    }

    // if timeFieldOption has a fieldName it's a time field, otherwise
    // it's a way to opt-out of the time field or an indication that there
    // are no fields available
    return Boolean(this.formValues.timeFieldOption.fieldName);
  };

  this.canEnableExpandWildcard = () => {
    return (
      this.isTimeBased() &&
        !this.isCrossClusterName() &&
        !this.formValues.nameIsPattern &&
        _.includes(this.formValues.name, '*')
    );
  };

  this.isExpandWildcardEnabled = () => {
    return (
      this.canEnableExpandWildcard() &&
        !!this.formValues.expandWildcard
    );
  };

  this.canUseTimePattern = () => {
    return (
      this.isTimeBased() &&
        !this.isExpandWildcardEnabled() &&
        !this.isCrossClusterName()
    );
  };

  this.isCrossClusterName = () => {
    return (
      this.formValues.name &&
        this.formValues.name.includes(':')
    );
  };

  this.isLoading = () => {
    return loadingCount > 0;
  };

  let activeRefreshTimeFieldOptionsCall;
  this.refreshTimeFieldOptions = () => {
    // if there is an active refreshTimeFieldOptions() call then we use
    // their prevOption, allowing the previous selection to persist
    // across simultaneous calls to refreshTimeFieldOptions()
    const prevOption = activeRefreshTimeFieldOptionsCall
      ? activeRefreshTimeFieldOptionsCall.prevOption
      : this.formValues.timeFieldOption;

    // `thisCall` is our unique "token" to verify that we are still the
    // most recent call. When we are not the most recent call we don't
    // modify the controller in any way to prevent race conditions
    const thisCall = activeRefreshTimeFieldOptionsCall = { prevOption };

    loadingCount += 1;
    this.timeFieldOptions = [];
    this.timeFieldOptionsError = null;
    this.formValues.timeFieldOption = null;
    getTimeFieldOptions()
      .then(({ options, error }) => {
        if (thisCall !== activeRefreshTimeFieldOptionsCall) return;

        this.timeFieldOptions = options;
        this.timeFieldOptionsError = error;
        if (!this.timeFieldOptions) {
          return;
        }

        // Restore the preivously selected state, or select the default option in the UI
        const restoredOption = findTimeFieldOption(prevOption);
        const defaultOption = pickDefaultTimeFieldOption();
        this.formValues.timeFieldOption = restoredOption || defaultOption;
      })
      .catch(notify.error)
      .finally(() => {
        loadingCount -= 1;
        if (thisCall === activeRefreshTimeFieldOptionsCall) {
          activeRefreshTimeFieldOptionsCall = null;
        }
      });
  };

  this.createIndexPattern = () => {
    const {
      name,
      timeFieldOption,
      nameIsPattern,
      nameInterval,
    } = this.formValues;

    const id = name;

    const timeFieldName = timeFieldOption
      ? timeFieldOption.fieldName
      : undefined;

    const notExpandable = this.isExpandWildcardEnabled()
      ? undefined
      : true;

    // Only event-time-based index patterns set an intervalName.
    const intervalName = (this.canUseTimePattern() && nameIsPattern && nameInterval)
      ? nameInterval.name
      : undefined;

    loadingCount += 1;
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
    'controller.formValues.nameInterval.name',
  ], (newVal, oldVal) => {
    const nameIsPattern = newVal[0];
    const newDefault = getDefaultPatternForInterval(newVal[1]);
    const oldDefault = getDefaultPatternForInterval(oldVal[1]);

    if (this.formValues.name === oldDefault) {
      this.formValues.name = newDefault;
    }

    if (!nameIsPattern) {
      delete this.formValues.nameInterval;
    } else {
      this.formValues.nameInterval = this.formValues.nameInterval || intervals.byName.days;
      this.formValues.name = this.formValues.name || getDefaultPatternForInterval(this.formValues.nameInterval);
    }
  });

  this.moreSamples = andUpdate => {
    this.sampleCount += 5;
    if (andUpdate) updateSamples();
  };

  let latestUpdateSampleId = -1;
  $scope.$watchMulti([
    'controller.formValues.name',
    'controller.formValues.nameInterval'
  ], () => {
    resetIndex();

    // track the latestUpdateSampleId at the time we started
    // so that we can avoid mutating the controller if the
    // watcher triggers again before we finish (which would
    // cause latestUpdateSampleId to increment and the
    // id === latestUpdateSampleId checks below to fail)
    const id = (++latestUpdateSampleId);
    updateSamples()
      .then(() => {
        if (latestUpdateSampleId === id) {
          this.samples = null;
          this.patternErrors = [];
        }
      })
      .catch(errors => {
        if (latestUpdateSampleId === id) {
          this.existing = null;
          this.patternErrors = errors;
        }
      })
      .finally(() => {
        this.refreshTimeFieldOptions();
      });
  });

  $scope.$watchMulti([
    'controller.sampleCount'
  ], () => {
    this.refreshTimeFieldOptions();
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
