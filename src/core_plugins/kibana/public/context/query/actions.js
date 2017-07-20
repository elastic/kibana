import _ from 'lodash';

import { fetchAnchorProvider } from '../api/anchor';
import { fetchContextProvider } from '../api/context';
import { QueryParameterActionsProvider } from '../query_parameters';
import { FAILURE_REASONS, LOADING_STATUS } from './constants';


export function QueryActionsProvider(courier, Notifier, Private, Promise) {
  const fetchAnchor = Private(fetchAnchorProvider);
  const { fetchPredecessors, fetchSuccessors } = Private(fetchContextProvider);
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

  const setFailedStatus = (state) => (subject, details = {}) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.FAILED,
      reason: FAILURE_REASONS.UNKNOWN,
      ...details,
    }
  );

  const setLoadedStatus = (state) => (subject) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADED,
    }
  );

  const setLoadingStatus = (state) => (subject) => (
    state.loadingStatus[subject] = {
      status: LOADING_STATUS.LOADING,
    }
  );

  const fetchAnchorRow = (state) => () => {
    const { queryParameters: { indexPatternId, anchorUid, sort, tieBreakerField } } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('anchor', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('anchor');

    return Promise.try(() => (
      fetchAnchor(indexPatternId, anchorUid, [_.zipObject([sort]), { [tieBreakerField]: 'asc' }])
    ))
      .then(
        (anchorDocument) => {
          setLoadedStatus(state)('anchor');
          state.rows.anchor = anchorDocument;
          return anchorDocument;
        },
        (error) => {
          setFailedStatus(state)('anchor', { error });
          notifier.error(error);
          throw error;
        }
      );
  };

  const fetchPredecessorRows = (state) => () => {
    const {
      queryParameters: { indexPatternId, filters, predecessorCount, sort, tieBreakerField },
      rows: { anchor },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('predecessors', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('predecessors');

    return Promise.try(() => (
      fetchPredecessors(indexPatternId, anchor, [_.zipObject([sort]), { [tieBreakerField]: 'asc' }], predecessorCount, filters)
    ))
      .then(
        (predecessorDocuments) => {
          setLoadedStatus(state)('predecessors');
          state.rows.predecessors = predecessorDocuments;
          return predecessorDocuments;
        },
        (error) => {
          setFailedStatus(state)('predecessors', { error });
          notifier.error(error);
          throw error;
        },
      );
  };

  const fetchSuccessorRows = (state) => () => {
    const {
      queryParameters: { indexPatternId, filters, sort, successorCount, tieBreakerField },
      rows: { anchor },
    } = state;

    if (!tieBreakerField) {
      return Promise.reject(setFailedStatus(state)('successors', {
        reason: FAILURE_REASONS.INVALID_TIEBREAKER
      }));
    }

    setLoadingStatus(state)('successors');

    return Promise.try(() => (
      fetchSuccessors(indexPatternId, anchor, [_.zipObject([sort]), { [tieBreakerField]: 'asc' }], successorCount, filters)
    ))
      .then(
        (successorDocuments) => {
          setLoadedStatus(state)('successors');
          state.rows.successors = successorDocuments;
          return successorDocuments;
        },
        (error) => {
          setFailedStatus(state)('successors', { error });
          notifier.error(error);
          throw error;
        },
      );
  };

  const fetchContextRows = (state) => () => (
    Promise.all([
      fetchPredecessorRows(state)(),
      fetchSuccessorRows(state)(),
    ])
  );

  const fetchAllRows = (state) => () => (
    Promise.try(fetchAnchorRow(state))
      .then(fetchContextRows(state))
  );

  const fetchContextRowsWithNewQueryParameters = (state) => (queryParameters) => {
    setQueryParameters(state)(queryParameters);
    return fetchContextRows(state)();
  };

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
    fetchContextRows,
    fetchContextRowsWithNewQueryParameters,
    fetchGivenPredecessorRows,
    fetchGivenSuccessorRows,
    fetchMorePredecessorRows,
    fetchMoreSuccessorRows,
    fetchPredecessorRows,
    fetchSuccessorRows,
    setAllRows,
  };
}
