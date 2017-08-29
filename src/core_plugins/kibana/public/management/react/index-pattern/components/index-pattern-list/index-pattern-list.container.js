/* eslint-disable */
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import IndexPatternList from './index-pattern-list.component';

import {
  fetchIndexPatterns,
} from './index-pattern-list.actions';

export default connect(
  state => {
    return Object.assign({}, state.indexPattern.indexPatternList);
  },
  dispatch => bindActionCreators({
  }, dispatch)
)(IndexPatternList);
