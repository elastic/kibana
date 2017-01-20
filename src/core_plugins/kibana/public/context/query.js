import _ from 'lodash';

import { fetchAnchor } from './api/anchor';
import { fetchPredecessors, fetchSuccessors } from './api/context';
import { QueryParameterActionsProvider } from './query_parameters';


function QueryActionsProvider(es, Private, Promise) {
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

    return Promise.try(() => (
      fetchAnchor(es, indexPattern, anchorUid, _.zipObject([sort]))
    ))
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

    return Promise.try(() => (
      fetchPredecessors(es, indexPattern, anchor, _.zipObject([sort]), predecessorCount)
    ))
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

    state.loadingStatus.successors = 'loading';

    return Promise.try(() => (
      fetchSuccessors(es, indexPattern, anchor, _.zipObject([sort]), successorCount)
    ))
      .then((successorDocuments) => {
        state.loadingStatus.successors = 'loaded';
        state.rows.successors = successorDocuments;
        return successorDocuments;
      });
  };

  const fetchAllRows = (state) => () => (
    Promise.try(fetchAnchorRow(state))
      .then(() => Promise.all([
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

  const setAllRows = (state) => (predecessorRows, anchorRow, successorRows) => (
    state.rows.all = [
      ...(predecessorRows || []),
      ...(anchorRow ? [anchorRow] : []),
      ...(successorRows || []),
    ]
  );

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
    setAllRows,
  };
}

export {
  QueryActionsProvider,
};
