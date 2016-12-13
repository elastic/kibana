import _ from 'lodash';

import 'ui/local_navigation/index';
import uiModules from 'ui/modules';
import contextAppTemplate from './app.html';
import {
  bindActionCreators,
  createDispatchProvider,
  createPipeline,
  createScopedUpdater,
} from './dispatch';
import {
  QueryParameterActionCreatorsProvider,
  selectPredecessorCount,
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
      size: '=',
      sort: '=',
    },
    template: contextAppTemplate,
  };
});

function ContextAppController(Private) {
  const createDispatch = Private(createDispatchProvider);
  const queryParameterActionCreators = Private(QueryParameterActionCreatorsProvider);
  const queryActionCreators = Private(QueryActionCreatorsProvider);

  this.state = createInitialState(
    this.anchorUid,
    this.columns,
    this.indexPattern,
    this.size,
    this.sort,
  );

  this.update = createPipeline(
    createScopedUpdater('queryParameters', updateQueryParameters),
    createScopedUpdater('rows', updateQueryResults),
    createScopedUpdater('loadingStatus', updateLoadingStatus),
  );

  this.dispatch = createDispatch(
    () => this.state,
    (state) => this.state = state,
    this.update,
  );

  this.actions = bindActionCreators({
    ...queryParameterActionCreators,
    ...queryActionCreators,
  }, this.dispatch);

  this.selectors = {
    rows: () => selectRows(this.state),
    isLoadingAnchorRow: () => selectIsLoadingAnchorRow(this.state),
    isLoadingPredecessorRows: () => selectIsLoadingPredecessorRows(this.state),
    isLoadingSuccessorRows: () => selectIsLoadingSuccessorRows(this.state),
    predecessorCount: (value) => (
      value ? this.actions.fetchGivenPredecessorRows(value) : selectPredecessorCount(this.state)
    ),
    successorCount: (value) => (
      value ? this.actions.fetchGivenSuccessorRows(value) : selectSuccessorCount(this.state)
    ),
  };

  this.actions.fetchAllRows();
}

function createInitialState(anchorUid, columns, indexPattern, size, sort) {
  return {
    queryParameters: {
      anchorUid,
      columns,
      indexPattern,
      predecessorCount: size,
      successorCount: size,
      sort,
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
    isInitialized: false,
  };
}
