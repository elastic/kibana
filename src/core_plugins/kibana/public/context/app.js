import _ from 'lodash';

import { uiModules } from 'ui/modules';
import contextAppTemplate from './app.html';
import './components/loading_button';
import './components/size_picker/size_picker';
import { getFirstSortableField } from './api/utils/sorting';
import {
  createInitialQueryParametersState,
  QueryParameterActionsProvider,
  QUERY_PARAMETER_KEYS,
} from './query_parameters';
import {
  createInitialLoadingStatusState,
  FAILURE_REASONS,
  LOADING_STATUS,
  QueryActionsProvider,
} from './query';

const module = uiModules.get('apps/context', [
  'elasticsearch',
  'kibana',
  'kibana/config',
  'kibana/notify',
  'ngRoute',
]);

module.directive('contextApp', function ContextApp() {
  return {
    bindToController: true,
    controller: ContextAppController,
    controllerAs: 'contextApp',
    restrict: 'E',
    scope: {
      anchorUid: '=',
      columns: '=',
      indexPattern: '=',
      filters: '=',
      predecessorCount: '=',
      successorCount: '=',
      sort: '=',
      discoverUrl: '=',
    },
    template: contextAppTemplate,
  };
});

function ContextAppController($scope, config, Private, timefilter) {
  const queryParameterActions = Private(QueryParameterActionsProvider);
  const queryActions = Private(QueryActionsProvider);

  // this is apparently the "canonical" way to disable the time picker
  timefilter.enabled = false;

  this.state = createInitialState(
    parseInt(config.get('context:step'), 10),
    getFirstSortableField(this.indexPattern, config.get('context:tieBreakerFields')),
    this.discoverUrl,
  );

  this.actions = _.mapValues(Object.assign(
    {},
    queryParameterActions,
    queryActions,
  ), (action) => (...args) => action(this.state)(...args));

  this.constants = {
    FAILURE_REASONS,
    LOADING_STATUS,
  };

  $scope.$watchGroup([
    () => this.state.rows.predecessors,
    () => this.state.rows.anchor,
    () => this.state.rows.successors,
  ], (newValues) => this.actions.setAllRows(...newValues));

  /**
   * Sync properties to state
   */
  $scope.$watchCollection(
    () => ({
      ...(_.pick(this, QUERY_PARAMETER_KEYS)),
      indexPatternId: this.indexPattern.id,
    }),
    (newQueryParameters) => {
      const { queryParameters } = this.state;
      if (
        (newQueryParameters.indexPatternId !== queryParameters.indexPatternId)
        || (newQueryParameters.anchorUid !== queryParameters.anchorUid)
        || (!_.isEqual(newQueryParameters.sort, queryParameters.sort))
      ) {
        this.actions.fetchAllRowsWithNewQueryParameters(_.cloneDeep(newQueryParameters));
      } else if (
        (newQueryParameters.predecessorCount !== queryParameters.predecessorCount)
        || (newQueryParameters.successorCount !== queryParameters.successorCount)
        || (!_.isEqual(newQueryParameters.filters, queryParameters.filters))
      ) {
        this.actions.fetchContextRowsWithNewQueryParameters(_.cloneDeep(newQueryParameters));
      }
    },
  );

  /**
   * Sync state to properties
   */
  $scope.$watchCollection(
    () => ({
      predecessorCount: this.state.queryParameters.predecessorCount,
      successorCount: this.state.queryParameters.successorCount,
    }),
    (newParameters) => {
      _.assign(this, newParameters);
    },
  );
}

function createInitialState(defaultStepSize, tieBreakerField, discoverUrl) {
  return {
    queryParameters: createInitialQueryParametersState(defaultStepSize, tieBreakerField),
    rows: {
      all: [],
      anchor: null,
      predecessors: [],
      successors: [],
    },
    loadingStatus: createInitialLoadingStatusState(),
    navigation: {
      discover: {
        url: discoverUrl,
      },
    },
  };
}
