/* eslint-disable */
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IndexPatternSearch from './index-pattern-search.component';

import {
  fetchIndices,
} from '../../../../../store/actions/index-pattern-creation';

import {
  getIndexPatternCreate,
} from '../../../../../reducers';

export default connect(
  state => {
    const { hasExactMatches } = getIndexPatternCreate(state).results;
    return { hasExactMatches };
  },
  { fetchIndices },
)(IndexPatternSearch);
