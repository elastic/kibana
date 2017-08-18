/* eslint-disable */
import { chunk } from 'lodash';
import {
  FETCHED_INDICES,
  INCLUDE_SYSTEM_INDICES,
  EXCLUDE_SYSTEM_INDICES,
  GOTO_NEXT_PAGE,
  GOTO_PREVIOUS_PAGE,
} from './index-pattern.actions';

const defaultState = {
  allIndices: [],
  filteredIndices: [],
  indices: [],
  page: 1,
  perPage: 10,
  includeSystemIndices: false,
};

function getFilteredIndices(indices, includeSystemIndices) {
  if (!indices) {
    return indices;
  }

  if (includeSystemIndices) {
    return indices;
  }

  // All system indices begin with a period.
  return indices.filter(index => !index.name.startsWith('.'));
}

function getPaginatedIndices(indices, page, perPage) {
  const pagesOfIndices = chunk(indices, perPage);
  return pagesOfIndices[page - 1];
}

function getNextPage({ page, perPage, filteredIndices }) {
  const pages = Math.ceil(filteredIndices.length / perPage);
  const nextPage = page + 1;
  return nextPage > pages
    ? 1
    : nextPage;
}

function getPreviousPage({ page, perPage, filteredIndices }) {
  const pages = Math.ceil(filteredIndices.length / perPage);
  const previousPage = page - 1;
  return previousPage < 1
    ? pages
    : previousPage;
}

function getFilteredAndPaginatedIndices({ allIndices, includeSystemIndices, page, perPage }) {
  const filteredIndices = getFilteredIndices(allIndices, includeSystemIndices);
  const indices = getPaginatedIndices(filteredIndices, page, perPage);
  return {
    filteredIndices,
    indices,
  };
}

export default function indexPattern(state = defaultState, action) {
  console.log('index-pattern.reducer', action, state);
  let newState = Object.assign({}, state);

  switch (action.type) {
    case FETCHED_INDICES:
      newState = Object.assign(newState, { allIndices: action.indices });
      break;
    case INCLUDE_SYSTEM_INDICES:
      newState = Object.assign(newState, { includeSystemIndices: true });
      break;
    case EXCLUDE_SYSTEM_INDICES:
      newState = Object.assign(newState, { includeSystemIndices: false });
      break;
    case GOTO_NEXT_PAGE:
      newState = Object.assign(newState, { page: getNextPage(state) });
      break;
    case GOTO_PREVIOUS_PAGE:
      newState = Object.assign(newState, { page: getPreviousPage(state) });
      break;
    default:
      return state;
  }

  return Object.assign(newState, getFilteredAndPaginatedIndices(newState));
};
