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
    display: `I don't want to use the Time Filter`,
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
  this.doesIncludeSystemIndices = false;
  this.timeFieldError = undefined;
  let allIndices = [];
  let matchingIndices = [];
  let partialMatchingIndices = [];
  this.allIndices = [];
  this.matchingIndices = [];
  this.partialMatchingIndices = [];

  function createReasonableWait() {
    return new Promise(resolve => {
      // Make every fetch take a set amount of time so the user gets some feedback that something
      // is happening.
      $timeout(() => {
        resolve();
      }, 500);
    });
  }

  const whiteListIndices = indices => {
    if (!indices) {
      return indices;
    }

    if (this.doesIncludeSystemIndices) {
      return indices;
    }

    // All system indices begin with a period.
    return indices.filter(index => (
      index.indexOf('.') !== 0
    ));
  };

  const updateWhiteListedIndices = () => {
    this.allIndices = whiteListIndices(allIndices);
    this.matchingIndices = whiteListIndices(matchingIndices);
    this.partialMatchingIndices = whiteListIndices(partialMatchingIndices);
  };

  this.onIncludeSystemIndicesChange = () => {
    updateWhiteListedIndices();
  };

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
      matchingIndicesResponse,
      partialMatchingIndicesResponse,
    ]) => {
      if (thisFetchMatchingIndicesRequest === mostRecentFetchMatchingIndicesRequest) {
        matchingIndices = matchingIndicesResponse.sort();
        partialMatchingIndices = partialMatchingIndicesResponse.sort();
        updateWhiteListedIndices();
        this.isFetchingMatchingIndices = false;
      }
    });
  };

  this.fetchExistingIndices = () => {
    this.isFetchingExistingIndices = true;
    Promise.all([
      indicesService.getIndices('*'),
      createReasonableWait(),
    ])
    .then(([allIndicesResponse]) => {
      // Cache all indices.
      allIndices = allIndicesResponse.sort();
      updateWhiteListedIndices();
      this.isFetchingExistingIndices = false;
    });
  };

  this.isSystemIndicesCheckBoxVisible = () => (
    this.wizardStep === 'indexPattern'
  );

  this.goToIndexPatternStep = () => {
    this.wizardStep = 'indexPattern';
  };

  this.goToTimeFieldStep = () => {
    // Re-initialize this step.
    this.formValues.timeFieldOption = undefined;
    this.fetchTimeFieldOptions();
    this.wizardStep = 'timeField';
  };

  this.hasIndices = () => (
    this.allIndices.length
  );

  this.isTimeBased = () => (
    this.formValues.timeFieldOption !== undefined
    && this.formValues.timeFieldOption !== noTimeFieldOption
    && this.formValues.timeFieldOption !== loadingOption
  );

  const isExpandWildcardEnabled = () => (
    this.canEnableExpandWildcard()
    && !!this.formValues.expandWildcard
  );

  const isCrossClusterName = () => (
    this.formValues.name
    && this.formValues.name.includes(':')
  );

  this.canEnableExpandWildcard = () => (
    this.isTimeBased()
    && !isCrossClusterName()
    && _.includes(this.formValues.name, '*')
  );

  const extractTimeFieldsFromFields = fields => {
    const dateFields = fields.filter(field => field.type === 'date');

    if (dateFields.length === 0) {
      return [{
        display: `The indices which match this index pattern don't contain any time fields.`,
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
        this.timeFieldError = 'Unable to fetch mapping. Do you have indices matching the pattern?';
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
        return notify.error(`Couldn't locate any indices matching that pattern. Please add the index to Elasticsearch`);
      }

      notify.fatal(err);
    }).finally(() => {
      this.isCreatingIndexPattern = false;
    });
  };

  this.fetchExistingIndices();
});
