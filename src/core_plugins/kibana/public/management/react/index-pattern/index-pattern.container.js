/* eslint-disable */
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IndexPattern from './index-pattern.component';

import {
  fetchIndices,
  includeSystemIndices,
  excludeSystemIndices,
} from './index-pattern.actions';

export default connect(
  state => {
    return {
      indices: state.indexPattern.whiteListIndices,
      includeSystemIndices: state.indexPattern.includeSystemIndices,
    };
  },
  dispatch => bindActionCreators({
    fetchIndicesAction: fetchIndices,
    includeSystemIndicesAction: includeSystemIndices,
    excludeSystemIndicesAction: excludeSystemIndices,
  }, dispatch)
)(IndexPattern);
