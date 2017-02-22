import _ from 'lodash';

import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import './components/loading_button';
import './components/size_picker/size_picker';
import {
  createInitialQueryParametersState,
  QueryParameterActionsProvider,
  QUERY_PARAMETER_KEYS,
} from './query_parameters';
import {
  createInitialLoadingStatusState,
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
      predecessorCount: '=',
      successorCount: '=',
      sort: '=',
      discoverUrl: '=',
    },
    template: contextAppTemplate,
  };
});

function ContextAppController($scope, config, Private) {
  const queryParameterActions = Private(QueryParameterActionsProvider);
  const queryActions = Private(QueryActionsProvider);

  this.state = createInitialState(
    parseInt(config.get('context:step'), 10),
    this.discoverUrl,
  );

  this.actions = _.mapValues(Object.assign(
    {},
    queryParameterActions,
    queryActions,
  ), (action) => (...args) => action(this.state)(...args));

  this.constants = {
    LOADING_STATUS,
  };

  $scope.$watchGroup([
    () => this.state.rows.predecessors,
    () => this.state.rows.anchor,
    () => this.state.rows.successors,
  ], (newValues) => this.actions.setAllRows(...newValues));

  /**
   * Sync query parameters to arguments
   */
  $scope.$watchCollection(
    () => _.pick(this, QUERY_PARAMETER_KEYS),
    (newValues) => {
      // break the watch cycle
      if (!_.isEqual(newValues, this.state.queryParameters)) {
        this.actions.fetchAllRowsWithNewQueryParameters(newValues);
      }
    },
  );

  $scope.$watchCollection(
    () => this.state.queryParameters,
    (newValues) => {
      _.assign(this, newValues);
    },
  );
}

function createInitialState(defaultStepSize, discoverUrl) {
  return {
    queryParameters: createInitialQueryParametersState(defaultStepSize),
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
