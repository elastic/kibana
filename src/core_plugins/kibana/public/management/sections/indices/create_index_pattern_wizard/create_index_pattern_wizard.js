import _ from 'lodash';
import { IndexPatternMissingIndices } from 'ui/errors';
import 'ui/directives/validate_index_pattern';
import 'ui/directives/auto_select_if_only_one';
import 'ui/directives/documentation_href';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from './create_index_pattern_wizard.html';
import { sendCreateIndexPatternRequest } from './send_create_index_pattern_request';
import './step_index_pattern';
import './step_time_field';
import './matching_indices_list';

uiRoutes
  .when('/management/kibana/index', {
    template,
  });

uiModules.get('apps/management')
  .controller('managementIndicesCreate', function (
    $routeParams,
    $scope,
    $timeout,
    config,
    es,
    indexPatterns,
    kbnUrl,
    Notifier,
    Promise
  ) {
  // This isn't ideal. We want to avoid searching for 20 indices
  // then filtering out the majority of them because they are sysetm indices.
  // We'd like to filter system indices out in the query
  // so if we can accomplish that in the future, this logic can go away
    const ESTIMATED_NUMBER_OF_SYSTEM_INDICES = 20;
    const MAX_NUMBER_OF_MATCHING_INDICES = 20;
    const MAX_SEARCH_SIZE = MAX_NUMBER_OF_MATCHING_INDICES + ESTIMATED_NUMBER_OF_SYSTEM_INDICES;
    const notify = new Notifier();
    const disabledDividerOption = {
      isDisabled: true,
      display: '───',
    };
    const noTimeFieldOption = {
      display: `I don't want to use the Time Filter`,
    };

    // Configure the new index pattern we're going to create.
    this.formValues = {
      id: $routeParams.id ? decodeURIComponent($routeParams.id) : undefined,
      name: '',
      expandWildcard: false,
      timeFieldOption: undefined,
    };

    // UI state.
    this.timeFieldOptions = [];
    this.wizardStep = 'indexPattern';
    this.isFetchingExistingIndices = true;
    this.isFetchingMatchingIndices = false;
    this.isFetchingTimeFieldOptions = false;
    this.isCreatingIndexPattern = false;
    this.doesIncludeSystemIndices = false;
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

    function getIndices(rawPattern, limit = MAX_SEARCH_SIZE) {
      const pattern = rawPattern.trim();

      // Searching for `*:` fails for CCS environments. The search request
      // is worthless anyways as the we should only send a request
      // for a specific query (where we do not append *) if there is at
      // least a single character being searched for.
      if (pattern === '*:') {
        return [];
      }

      const params = {
        index: pattern,
        ignore: [404],
        body: {
          size: 0, // no hits
          aggs: {
            indices: {
              terms: {
                field: '_index',
                size: limit,
              }
            }
          }
        }
      };

      return es.search(params)
        .then(response => {
          if (!response || response.error || !response.aggregations) {
            return [];
          }

          return _.sortBy(response.aggregations.indices.buckets.map(bucket => {
            return {
              name: bucket.key
            };
          }), 'name');
        })
        .catch(err => {
          const type = _.get(err, 'body.error.caused_by.type');
          if (type === 'index_not_found_exception') {
            // This happens in a CSS environment when the controlling node returns a 500 even though the data
            // nodes returned a 404. Remove this when/if this is handled: https://github.com/elastic/elasticsearch/issues/27461
            return [];
          }
          throw err;
        });
    }

    const whiteListIndices = indices => {
      if (!indices) {
        return indices;
      }

      const acceptableIndices = this.doesIncludeSystemIndices
        ? indices
        // All system indices begin with a period.
        : indices.filter(index => !index.name.startsWith('.'));

      return acceptableIndices.slice(0, MAX_NUMBER_OF_MATCHING_INDICES);
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
        getIndices(exactSearchQuery),
        getIndices(partialSearchQuery),
        createReasonableWait()
      ])
        .then(([
          matchingIndicesResponse,
          partialMatchingIndicesResponse
        ]) => {
          if (thisFetchMatchingIndicesRequest === mostRecentFetchMatchingIndicesRequest) {
            matchingIndices = matchingIndicesResponse;
            partialMatchingIndices = partialMatchingIndicesResponse;
            updateWhiteListedIndices();
            this.isFetchingMatchingIndices = false;
          }
        }).catch(error => {
          notify.error(error);
        });
    };

    this.fetchExistingIndices = () => {
      this.isFetchingExistingIndices = true;
      const allExistingLocalIndicesPattern = '*';

      Promise.all([
        getIndices(allExistingLocalIndicesPattern),
        createReasonableWait()
      ])
        .then(([allIndicesResponse]) => {
          // Cache all indices.
          allIndices = allIndicesResponse;
          updateWhiteListedIndices();
          this.isFetchingExistingIndices = false;
        }).catch(error => {
          notify.error(error);
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
      this.formValues.timeFieldOption = undefined;
      this.timeFieldOptions = [];

      Promise.all([
        indexPatterns.fieldsFetcher.fetchForWildcard(this.formValues.name),
        createReasonableWait(),
      ])
        .then(([fields]) => {
          this.timeFieldOptions = extractTimeFieldsFromFields(fields);
        })
        .catch(error => {
          notify.error(error);
        })
        .finally(() => {
          this.isFetchingTimeFieldOptions = false;
        });
    };

    this.createIndexPattern = () => {
      this.isCreatingIndexPattern = true;

      const {
        id,
        name,
        timeFieldOption,
      } = this.formValues;

      const timeFieldName = timeFieldOption
        ? timeFieldOption.fieldName
        : undefined;

      sendCreateIndexPatternRequest(indexPatterns, {
        id,
        name,
        timeFieldName,
      }).then(createdId => {
        if (!createdId) {
          return;
        }

        if (!config.get('defaultIndex')) {
          config.set('defaultIndex', createdId);
        }

        indexPatterns.cache.clear(createdId);
        kbnUrl.change(`/management/kibana/indices/${createdId}`);
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
