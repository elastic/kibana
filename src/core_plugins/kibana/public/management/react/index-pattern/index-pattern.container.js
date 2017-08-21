/* eslint-disable */
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IndexPattern from './index-pattern.component';

import {
  fetchIndices,
  includeSystemIndices,
  excludeSystemIndices,
  goToNextPage,
  goToPreviousPage,
  changeSort,
} from './index-pattern.actions';

export default connect(
  state => {
    return {
      filteredIndices: state.indexPattern.filteredIndices,
      indices: state.indexPattern.indices,
      includeSystemIndices: state.indexPattern.includeSystemIndices,
      page: state.indexPattern.page,
      perPage: state.indexPattern.perPage,
      sortBy: state.indexPattern.sortBy,
      sortAsc: state.indexPattern.sortAsc,
    };
  },
  dispatch => bindActionCreators({
    fetchIndicesAction: fetchIndices,
    includeSystemIndicesAction: includeSystemIndices,
    excludeSystemIndicesAction: excludeSystemIndices,
    goToNextPageAction: goToNextPage,
    goToPreviousPageAction: goToPreviousPage,
    changeSortAction: changeSort,
  }, dispatch)
)(IndexPattern);
