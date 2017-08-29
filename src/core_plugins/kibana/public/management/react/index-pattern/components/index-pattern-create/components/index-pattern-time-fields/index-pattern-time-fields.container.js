/* eslint-disable */
import { connect } from 'react-redux';
import IndexPatternTimeFields from './index-pattern-time-fields.component';

import {
  fetchTimeFields,
  selectTimeField,
} from '../../../../../store/actions/index-pattern-creation';

export default connect(
  state => ({ ...state.indexPattern.indexPatternCreate.timeFields }),
  { fetchTimeFields, selectTimeField },
)(IndexPatternTimeFields);
