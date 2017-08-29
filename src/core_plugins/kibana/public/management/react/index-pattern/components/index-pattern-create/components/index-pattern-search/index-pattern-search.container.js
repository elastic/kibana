/* eslint-disable */
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IndexPatternSearch from './index-pattern-search.component';

import {
  fetchIndices,
} from '../../../../../store/actions/index-pattern-creation';

export default connect(
  state => {
    const { hasExactMatches } = state.indexPattern.indexPatternCreate.results;
    return { hasExactMatches };
  },
  { fetchIndices },
)(IndexPatternSearch);
