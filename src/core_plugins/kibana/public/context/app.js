import _ from 'lodash';

import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import './components/loading_button';
import './components/size_picker/size_picker';
import { bindSelectors } from './utils/selectors';
import {
  createInitialQueryParametersState,
  QueryParameterActionsProvider,
  QUERY_PARAMETER_KEYS,
} from './query_parameters';
import {
  QueryActionsProvider,
  selectIsLoadingAnchorRow,
  selectIsLoadingPredecessorRows,
  selectIsLoadingSuccessorRows,
  selectRows,
} from './query';

const module = uiModules.get('apps/context', [
  'kibana',
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
    },
    template: contextAppTemplate,
  };
});

function ContextAppController($scope, Private) {
  const queryParameterActions = Private(QueryParameterActionsProvider);
  const queryActions = Private(QueryActionsProvider);

  this.state = createInitialState();

  this.actions = _.mapValues({
    ...queryParameterActions,
    ...queryActions,
  }, (action) => (...args) => action(this.state)(...args));

  this.derivedState = bindSelectors({
    isLoadingAnchorRow: selectIsLoadingAnchorRow,
    isLoadingPredecessorRows: selectIsLoadingPredecessorRows,
    isLoadingSuccessorRows: selectIsLoadingSuccessorRows,
    rows: selectRows,
  }, () => this.state);

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

function createInitialState() {
  return {
    queryParameters: createInitialQueryParametersState(),
    rows: {
      anchor: null,
      predecessors: [],
      successors: [],
    },
    loadingStatus: {
      anchor: 'uninitialized',
      predecessors: 'uninitialized',
      successors: 'uninitialized',
    },
  };
}
