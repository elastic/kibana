import _ from 'lodash';

import { fetchAnchor } from './api/anchor';
import { fetchPredecessors, fetchSuccessors } from './api/context';
import { createSelector } from './utils/selectors';
import { QueryParameterActionsProvider } from './query_parameters';


function QueryActionsProvider($q, es, Private) {
  const {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  } = Private(QueryParameterActionsProvider);


  const fetchAnchorRow = (state) => () => {
    const { queryParameters: { indexPattern, anchorUid, sort } } = state;

    state.loadingStatus.anchor = 'loading';

    return fetchAnchor(es, indexPattern, anchorUid, _.zipObject([sort]))
      .then((anchorDocument) => {
        state.loadingStatus.anchor = 'loaded';
        state.rows.anchor = anchorDocument;
        return anchorDocument;
      });
  };

  const fetchPredecessorRows = (state) => () => {
    const {
      queryParameters: { indexPattern, predecessorCount, sort },
      rows: { anchor },
    } = state;

    state.loadingStatus.predecessors = 'loading';

    return fetchPredecessors(es, indexPattern, anchor, _.zipObject([sort]), predecessorCount)
      .then((predecessorDocuments) => {
        state.loadingStatus.predecessors = 'loaded';
        state.rows.predecessors = predecessorDocuments;
        return predecessorDocuments;
      });
  };

  const fetchSuccessorRows = (state) => () => {
    const {
      queryParameters: { indexPattern, sort, successorCount },
      rows: { anchor },
    } = state;

    return fetchSuccessors(es, indexPattern, anchor, _.zipObject([sort]), successorCount)
      .then((successorDocuments) => {
        state.loadingStatus.successors = 'loaded';
        state.rows.successors = successorDocuments;
        return successorDocuments;
      });
  };

  const fetchAllRows = (state) => () => (
    fetchAnchorRow(state)()
      .then(() => $q.all([
        fetchPredecessorRows(state)(),
        fetchSuccessorRows(state)(),
      ]))
  );

  const fetchAllRowsWithNewQueryParameters = (state) => (queryParameters) => {
    setQueryParameters(state)(queryParameters);
    return fetchAllRows(state)();
  };

  const fetchGivenPredecessorRows = (state) => (count) => {
    setPredecessorCount(state)(count);
    return fetchPredecessorRows(state)();
  };

  const fetchGivenSuccessorRows = (state) => (count) => {
    setSuccessorCount(state)(count);
    return fetchSuccessorRows(state)();
  };

  const fetchMorePredecessorRows = (state) => () => {
    increasePredecessorCount(state)();
    return fetchPredecessorRows(state)();
  };

  const fetchMoreSuccessorRows = (state) => () => {
    increaseSuccessorCount(state)();
    return fetchSuccessorRows(state)();
  };

  return {
    fetchAllRows,
    fetchAllRowsWithNewQueryParameters,
    fetchAnchorRow,
    fetchGivenPredecessorRows,
    fetchGivenSuccessorRows,
    fetchMorePredecessorRows,
    fetchMoreSuccessorRows,
    fetchPredecessorRows,
    fetchSuccessorRows,
  };
}

const selectIsLoadingAnchorRow = createSelector([
  (state) => state.loadingStatus.anchor,
], (anchorLoadingStatus) => (
  _.includes(['loading', 'uninitialized'], anchorLoadingStatus)
));

const selectIsLoadingPredecessorRows = createSelector([
  (state) => state.loadingStatus.predecessors,
], (predecessorsLoadingStatus) => (
  _.includes(['loading', 'uninitialized'], predecessorsLoadingStatus)
));

const selectIsLoadingSuccessorRows = createSelector([
  (state) => state.loadingStatus.successors,
], (successorsLoadingStatus) => (
  _.includes(['loading', 'uninitialized'], successorsLoadingStatus)
));

const selectRows = createSelector([
  (state) => state.rows.predecessors,
  (state) => state.rows.anchor,
  (state) => state.rows.successors,
], (predecessorRows, anchorRow, successorRows) => (
  [...predecessorRows, ...(anchorRow ? [anchorRow] : []), ...successorRows]
));


export {
  QueryActionsProvider,
  selectIsLoadingAnchorRow,
  selectIsLoadingPredecessorRows,
  selectIsLoadingSuccessorRows,
  selectRows,
};
