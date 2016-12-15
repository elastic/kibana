import _ from 'lodash';

import { fetchAnchor } from './api/anchor';
import { fetchPredecessors, fetchSuccessors } from './api/context';
import { createSelector, started } from './dispatch';
import {
  QueryParameterActionCreatorsProvider,
  selectPredecessorCount,
  selectSuccessorCount,
} from './query_parameters';


function QueryActionCreatorsProvider($q, es, Private) {
  const {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  } = Private(QueryParameterActionCreatorsProvider);

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

  function fetchAllRows() {
    return (dispatch) => ({
      type: 'context/fetch_all_rows',
      payload: dispatch(fetchAnchorRow())
        .then(() => $q.all([
          dispatch(fetchPredecessorRows()),
          dispatch(fetchSuccessorRows()),
        ])),
    });
  }

  function fetchAllRowsWithNewQueryParameters(queryParameters) {
    return (dispatch) => {
      dispatch(setQueryParameters(queryParameters));
      return dispatch(fetchAllRows());
    };
  }

  function fetchAnchorRow() {
    return (dispatch, getState) => {
      const { queryParameters: { indexPattern, anchorUid, sort } } = getState();

      return dispatch({
        type: 'context/fetch_anchor_row',
        payload: fetchAnchor(es, indexPattern, anchorUid, _.zipObject([sort])),
      });
    };
  }

  function fetchPredecessorRows() {
    return (dispatch, getState) => {
      const state = getState();
      const {
        queryParameters: { indexPattern, sort },
        rows: { anchor },
      } = state;
      const predecessorCount = selectPredecessorCount(state);

      return dispatch({
        type: 'context/fetch_predecessor_rows',
        payload: fetchPredecessors(es, indexPattern, anchor, _.zipObject([sort]), predecessorCount),
      });
    };
  }

  function fetchSuccessorRows() {
    return (dispatch, getState) => {
      const state = getState();
      const {
        queryParameters: { indexPattern, sort },
        rows: { anchor },
      } = state;
      const successorCount = selectSuccessorCount(state);

      return dispatch({
        type: 'context/fetch_successor_rows',
        payload: fetchSuccessors(es, indexPattern, anchor, _.zipObject([sort]), successorCount),
      });
    };
  }

  function fetchGivenPredecessorRows(count) {
    return (dispatch) => {
      dispatch(setPredecessorCount(count));
      return dispatch(fetchPredecessorRows());
    };
  }

  function fetchGivenSuccessorRows(count) {
    return (dispatch) => {
      dispatch(setSuccessorCount(count));
      return dispatch(fetchSuccessorRows());
    };
  }
  function fetchMorePredecessorRows() {
    return (dispatch) => {
      dispatch(increasePredecessorCount());
      return dispatch(fetchPredecessorRows());
    };
  }

  function fetchMoreSuccessorRows() {
    return (dispatch) => {
      dispatch(increaseSuccessorCount());
      return dispatch(fetchSuccessorRows());
    };
  }
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

function updateQueryResults(state, action) {
  switch (action.type) {
    case 'context/fetch_anchor_row':
      return { ...state, anchor: action.payload };
    case 'context/fetch_predecessor_rows':
      return { ...state, predecessors: action.payload };
    case 'context/fetch_successor_rows':
      return { ...state, successors: action.payload };
    default:
      return state;
  }
}

function updateLoadingStatus(state, action) {
  switch (action.type) {
    case started('context/fetch_anchor_row'):
      return { ...state, anchor: 'loading' };
    case 'context/fetch_anchor_row':
      return { ...state, anchor: 'loaded' };
    case started('context/fetch_predecessor_rows'):
      return { ...state, predecessors: 'loading' };
    case 'context/fetch_predecessor_rows':
      return { ...state, predecessors: 'loaded' };
    case started('context/fetch_successor_rows'):
      return { ...state, successors: 'loading' };
    case 'context/fetch_successor_rows':
      return { ...state, successors: 'loaded' };
    default:
      return state;
  }
}


export {
  QueryActionCreatorsProvider,
  selectIsLoadingAnchorRow,
  selectIsLoadingPredecessorRows,
  selectIsLoadingSuccessorRows,
  selectRows,
  updateLoadingStatus,
  updateQueryResults,
};
