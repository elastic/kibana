/* eslint-disable */
import { connect } from 'react-redux';
import IndexPatternTimeFields from './index-pattern-time-fields.component';

import {
  fetchTimeFields,
  selectTimeField,
} from '../../../../../store/actions/index-pattern-creation';

import {
  getIndexPatternCreate,
} from '../../../../../reducers';

export default connect(
  state => ({ ...getIndexPatternCreate(state).timeFields }),
  { fetchTimeFields, selectTimeField },
)(IndexPatternTimeFields);
