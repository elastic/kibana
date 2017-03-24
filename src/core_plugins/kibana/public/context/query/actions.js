import _ from 'lodash';

import { fetchAnchor } from '../api/anchor';
import { fetchPredecessors, fetchSuccessors } from '../api/context';
import { QueryParameterActionsProvider } from '../query_parameters';
import { LOADING_STATUS } from './constants';


export function QueryActionsProvider(es, Notifier, Private, Promise) {
  const {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  } = Private(QueryParameterActionsProvider);

  const notifier = new Notifier({
    location: 'Context',
  });

  const setLoadingStatus = (state) => (subject, status) => (
    state.loadingStatus[subject] = status
  );

  const fetchAnchorRow = (state) => () => {
    const { queryParameters: { indexPattern, anchorUid, sort } } = state;

    setLoadingStatus(state)('anchor', LOADING_STATUS.LOADING);

    return Promise.try(() => (
      fetchAnchor(es, indexPattern, anchorUid, _.zipObject([sort]))
    ))
      .then(
        (anchorDocument) => {
          setLoadingStatus(state)('anchor', LOADING_STATUS.LOADED);
          state.rows.anchor = anchorDocument;
          return anchorDocument;
        },
        (error) => {
          setLoadingStatus(state)('anchor', LOADING_STATUS.FAILED);
          notifier.error(error);
          throw error;
        }
      );
  };

  const fetchPredecessorRows = (state) => () => {
    const {
      queryParameters: { indexPattern, predecessorCount, sort },
      rows: { anchor },
    } = state;

    setLoadingStatus(state)('predecessors', LOADING_STATUS.LOADING);

    return Promise.try(() => (
      fetchPredecessors(es, indexPattern, anchor, _.zipObject([sort]), predecessorCount)
    ))
      .then(
        (predecessorDocuments) => {
          setLoadingStatus(state)('predecessors', LOADING_STATUS.LOADED);
          state.rows.predecessors = predecessorDocuments;
          return predecessorDocuments;
        },
        (error) => {
          setLoadingStatus(state)('predecessors', LOADING_STATUS.FAILED);
          notifier.error(error);
          throw error;
        },
      );
  };

  const fetchSuccessorRows = (state) => () => {
    const {
      queryParameters: { indexPattern, sort, successorCount },
      rows: { anchor },
    } = state;

    setLoadingStatus(state)('successors', LOADING_STATUS.LOADING);

    return Promise.try(() => (
      fetchSuccessors(es, indexPattern, anchor, _.zipObject([sort]), successorCount)
    ))
      .then(
        (successorDocuments) => {
          setLoadingStatus(state)('successors', LOADING_STATUS.LOADED);
          state.rows.successors = successorDocuments;
          return successorDocuments;
        },
        (error) => {
          setLoadingStatus(state)('successors', LOADING_STATUS.FAILED);
          notifier.error(error);
          throw error;
        },
      );
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
