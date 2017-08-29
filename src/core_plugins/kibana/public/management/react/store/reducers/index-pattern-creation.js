import { handleActions } from 'redux-actions';
import { createSelector } from 'reselect';
import { chunk, sortBy as sortByLodash } from 'lodash';

import {
  selectTimeField,
  fetchedTimeFields,
  goToNextPage,
  goToPreviousPage,
  changeSort,
  fetchedIndices,
  includeSystemIndices,
  excludeSystemIndices,
  creatingIndexPattern,
  createdIndexPattern,
} from '../actions/index-pattern-creation';

const defaultState = {
  isIncludingSystemIndices: false,
  isCreating: false,
  timeFields: {
    timeFields: undefined,
    selectedTimeField: undefined,
  },
  results: {
    indices: undefined,
    pattern: undefined,
    hasExactMatches: false,
    perPage: 10,
    page: 1,
    sortBy: undefined,
    sortAsc: true,
  }
}

export default handleActions({
  [selectTimeField](state, { payload }) {
    const { timeFields } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        timeFields,
      },
    };
  },
  [fetchedTimeFields](state, { payload }) {
    const { timeFields } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        timeFields,
      },
    };
  },
  [selectTimeField](state, { payload }) {
    const { timeField } = payload;

    return {
      ...state,
      timeFields: {
        ...state.timeFields,
        selectedTimeField: timeField,
      },
    };
  },
  [fetchedIndices](state, { payload }) {
    const { indices, hasExactMatches, pattern } = payload;

    return {
      ...state,
      results: {
        ...state.results,
        indices,
        hasExactMatches,
        pattern,
      },
    };
  },
  [changeSort](state, { payload }) {
    const { sortBy, sortAsc } = payload;

    return {
      ...state,
      results: {
        ...state.results,
        sortBy,
        sortAsc: sortBy === state.sortBy ? !state.sortAsc: sortAsc,
      },
    };
  },
  [goToNextPage](state, { payload }) {
    return {
      ...state,
      results: {
        ...state.results,
        page: getNextPage(state.results),
      },
    };
  },
  [goToPreviousPage](state, { payload }) {
    return {
      ...state,
      results: {
        ...state.results,
        page: getPreviousPage(state.results),
      },
    };
  },
  [includeSystemIndices](state, action) {
    return {
      ...state,
      isIncludingSystemIndices: true,
    };
  },
  [excludeSystemIndices](state, action) {
    return {
      ...state,
      isIncludingSystemIndices: false,
    };
  },
  [creatingIndexPattern](state, action) {
    return {
      ...state,
      isCreating: true,
    };
  },
  [createdIndexPattern](state, action) {
    return {
      ...state,
      isCreating: false,
    };
  },
}, defaultState);

function getNextPage({ page, perPage, indices }) {
  const pages = Math.ceil(indices.length / perPage);
  const nextPage = page + 1;
  return nextPage > pages
    ? 1
    : nextPage;
}

function getPreviousPage({ page, perPage, indices }) {
  const pages = Math.ceil(indices.length / perPage);
  const previousPage = page - 1;
  return previousPage < 1
    ? pages
    : previousPage;
}

function getFilteredIndices(indices, isIncludingSystemIndices) {
  if (!indices) {
    return indices;
  }

  if (isIncludingSystemIndices) {
    return indices;
  }

  // All system indices begin with a period.
  return indices.filter(index => !index.name.startsWith('.'));
}

function getPaginatedIndices(indices, page, perPage) {
  const pagesOfIndices = chunk(indices, perPage);
  return pagesOfIndices[page - 1];
}

export const getFilteredAndPaginatedIndices = createSelector(
  [
    state => state.results,
    state => state.isIncludingSystemIndices
  ],
  ({
    indices: allIndices,
    page,
    perPage,
    sortBy,
    sortAsc,
  }, isIncludingSystemIndices) => {
    if (allIndices === undefined) {
      return {
        indices: undefined,
        numOfPages: 0,
      };
    }

    let filteredIndices = getFilteredIndices(allIndices, isIncludingSystemIndices);
    if (!!sortBy) {
      filteredIndices = sortByLodash(filteredIndices, sortBy);
      if (!sortAsc) {
        filteredIndices.reverse();
      }
    }

    const numOfPages = Math.ceil(filteredIndices.length / perPage);
    const indices = getPaginatedIndices(filteredIndices, page, perPage);
    return {
      indices,
      numOfPages,
    }
  }
);
