import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_pattern';
import 'ui/directives/auto_select_if_only_one';
import { RefreshKibanaIndex } from '../refresh_kibana_index';
import { documentationLinks } from 'ui/documentation_links/documentation_links';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './create_index_pattern_wizard.html';
import { sendCreateIndexPatternRequest } from './send_create_index_pattern_request';
import './step_index_pattern';
import './step_time_field';
import './matching_indices_list';
import 'ui/indices';

uiRoutes
.when('/management/kibana/index', {
  template,
});

uiModules.get('apps/management')
.controller('managementIndicesCreate', function (
  $injector,
  $scope,
  $timeout,
  $translate,
  config,
  es,
  indexPatterns,
  kbnUrl,
  Notifier,
  Private,
  Promise
) {
  const indicesService = $injector.get('indices');
  const notify = new Notifier();
  const refreshKibanaIndex = Private(RefreshKibanaIndex);
  const loadingOption = {
    display: 'Loading...',
  };
  const disabledDividerOption = {
    isDisabled: true,
    display: '───',
  };
  const noTimeFieldOption = {
    display: $translate.instant('KIBANA-NO_DATE_FIELD_DESIRED')
  };

  this.documentationLinks = documentationLinks;

  // Configure the new index pattern we're going to create.
  this.formValues = {
    name: '',
    expandWildcard: false,
    timeFieldOption: loadingOption,
  };

  // UI state.
  this.timeFieldOptions = [
    loadingOption,
  ];
  this.wizardStep = 'indexPattern';
  this.isFetchingExistingIndices = true;
  this.isFetchingMatchingIndices = false;
  this.isFetchingTimeFieldOptions = false;
  this.isCreatingIndexPattern = false;
  this.timeFieldError = undefined;
  this.allIndices = [];
  this.allTemplateIndexPatterns = [];
  this.matchingIndices = [];
  this.partialMatchingIndices = [];

  function whiteListIndices(indices) {
    return indices.filter(index => (
      // The majority of users won't want to create an index pattern for the .kibana index.
      index !== '.kibana'
    ));
  }

  function createReasonableWait() {
    return new Promise(resolve => {
      // Make every fetch take a set amount of time so the user gets some feedback that something
      // is happening.
      $timeout(() => {
        resolve();
      }, 1000);
    });
  }

  let mostRecentFetchMatchingIndicesRequest;

  this.fetchMatchingIndices = () => {
    this.isFetchingMatchingIndices = true;

    // Default to searching for all indices.
    const exactSearchQuery = this.formValues.name;
    let partialSearchQuery = this.formValues.name;

    if (!_.endsWith(partialSearchQuery, '*')) {
      partialSearchQuery = `${partialSearchQuery}*`;
    }
    if (!_.startsWith(partialSearchQuery, '*')) {
      partialSearchQuery = `*${partialSearchQuery}`;
    }

    const thisFetchMatchingIndicesRequest = mostRecentFetchMatchingIndicesRequest = Promise.all([
      indicesService.getIndices(exactSearchQuery),
      indicesService.getIndices(partialSearchQuery),
      createReasonableWait(),
    ])
    .then(([
      matchingIndices,
      partialMatchingIndices,
    ]) => {
      if (thisFetchMatchingIndicesRequest === mostRecentFetchMatchingIndicesRequest) {
        this.matchingIndices = whiteListIndices(matchingIndices).sort();
        this.partialMatchingIndices = whiteListIndices(partialMatchingIndices).sort();
        this.isFetchingMatchingIndices = false;
      }
    });
  };

  this.fetchExistingIndices = () => {
    this.isFetchingExistingIndices = true;
    Promise.all([
      indicesService.getIndices('*'),
      indicesService.getTemplateIndexPatterns('*'),
      createReasonableWait(),
    ])
    .then(([allIndices, allTemplateIndexPatterns]) => {
      // Cache all indices.
      this.allIndices = whiteListIndices(allIndices).sort();
      this.allTemplateIndexPatterns = allTemplateIndexPatterns.sort();
      this.isFetchingExistingIndices = false;
    });
  };

  this.goToIndexPatternStep = () => {
    this.wizardStep = 'indexPattern';
  };

  this.goToTimeFieldStep = () => {
    // Re-initialize this step.
    this.formValues.timeFieldOption = undefined;
    this.fetchTimeFieldOptions();
    this.wizardStep = 'timeField';
  };

  this.hasIndices = () => {
    return this.allIndices.length;
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

  const isExpandWildcardEnabled = () => {
    return (
      this.canEnableExpandWildcard()
      && !!this.formValues.expandWildcard
    );
  };

  const isCrossClusterName = () => {
    return (
      this.formValues.name
      && this.formValues.name.includes(':')
    );
  };

  this.canEnableExpandWildcard = () => {
    return (
      this.isTimeBased()
      && !isCrossClusterName()
      && _.includes(this.formValues.name, '*')
    );
  };

  const extractTimeFieldsFromFields = fields => {
    const dateFields = fields.filter(field => field.type === 'date');

    if (dateFields.length === 0) {
      return [{
        display: $translate.instant('KIBANA-INDICES_DONT_CONTAIN_TIME_FIELDS')
      }];
    }

    return [
      ...dateFields.map(field => ({
        display: field.name,
        fieldName: field.name
      })),
      disabledDividerOption,
      noTimeFieldOption,
    ];
  };

  this.fetchTimeFieldOptions = () => {
    this.isFetchingTimeFieldOptions = true;
    this.formValues.timeFieldOption = loadingOption;
    this.timeFieldOptions = [loadingOption];

    Promise.all([
      indexPatterns.fieldsFetcher.fetchForWildcard(this.formValues.name),
      createReasonableWait(),
    ])
    .then(([fields]) => {
      this.timeFieldOptions = extractTimeFieldsFromFields(fields);
    })
    .catch(err => {
      if (err instanceof IndexPatternMissingIndices) {
        this.timeFieldError = $translate.instant('KIBANA-INDICES_MATCH_PATTERN');
      }

      notify.error(err);
    })
    .finally(() => {
      this.isFetchingTimeFieldOptions = false;
    });
  };

  this.createIndexPattern = () => {
    this.isCreatingIndexPattern = true;

    const {
      name,
      timeFieldOption,
    } = this.formValues;

    const id = name;

    const timeFieldName = timeFieldOption
      ? timeFieldOption.fieldName
      : undefined;

    const notExpandable = isExpandWildcardEnabled()
      ? undefined
      : true;

    sendCreateIndexPatternRequest(indexPatterns, {
      id,
      timeFieldName,
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
    }).finally(() => {
      this.isCreatingIndexPattern = false;
    });
  };

  this.fetchExistingIndices();
});
