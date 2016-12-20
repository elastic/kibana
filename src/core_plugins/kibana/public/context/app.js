import _ from 'lodash';

import 'ui/local_navigation/index';
import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import './app.less';
import './components/size_picker';
import { createDispatchProvider } from './redux_lite/create_dispatch';
import { createReducerPipeline, scopeReducer } from './redux_lite/reducer_helpers';
import { bindActionCreators } from './redux_lite/action_creator_helpers';
import { bindSelectors } from './redux_lite/selector_helpers';
import {
  QueryParameterActionCreatorsProvider,
  QUERY_PARAMETER_KEYS,
  selectPredecessorCount,
  selectQueryParameters,
  selectSuccessorCount,
  updateQueryParameters,
} from './query_parameters';
import {
  QueryActionCreatorsProvider,
  selectIsLoadingAnchorRow,
  selectIsLoadingPredecessorRows,
  selectIsLoadingSuccessorRows,
  selectRows,
  updateLoadingStatus,
  updateQueryResults
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
  const createDispatch = Private(createDispatchProvider);
  const queryParameterActionCreators = Private(QueryParameterActionCreatorsProvider);
  const queryActionCreators = Private(QueryActionCreatorsProvider);

  this.state = createInitialState();

  this.reducer = createReducerPipeline(
    scopeReducer('queryParameters', updateQueryParameters),
    scopeReducer('rows', updateQueryResults),
    scopeReducer('loadingStatus', updateLoadingStatus),
  );

  this.dispatch = createDispatch(
    () => this.state,
    (state) => this.state = state,
    this.reducer,
  );

  this.actions = bindActionCreators({
    ...queryParameterActionCreators,
    ...queryActionCreators,
  }, this.dispatch);

  this.selectors = bindSelectors({
    isLoadingAnchorRow: selectIsLoadingAnchorRow,
    isLoadingPredecessorRows: selectIsLoadingPredecessorRows,
    isLoadingSuccessorRows: selectIsLoadingSuccessorRows,
    predecessorCount: selectPredecessorCount,
    rows: selectRows,
    successorCount: selectSuccessorCount,
  }, () => this.state);

  /**
   * Sync query parameters to arguments
   */
  $scope.$watchCollection(
    () => _.pick(this, QUERY_PARAMETER_KEYS),
    (newValues) => {
      // break the watch cycle
      if (!_.isEqual(newValues, selectQueryParameters(this.state))) {
        this.dispatch(queryActionCreators.fetchAllRowsWithNewQueryParameters(newValues));
      }
    },
  );

  $scope.$watchCollection(
    () => selectQueryParameters(this.state),
    (newValues) => {
      _.assign(this, newValues);
    },
  );
}

function createInitialState() {
  return {
    queryParameters: {
      anchorUid: null,
      columns: [],
      indexPattern: null,
      predecessorCount: 0,
      successorCount: 0,
      sort: [],
    },
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
