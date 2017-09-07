/* eslint-disable */
import { connect } from 'react-redux';
import IndexPatternTimeFields from './index-pattern-time-fields.component';

import {
  fetchTimeFields,
  selectTimeField,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getTimeFields,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

export default connect(
  state => ({ ...getTimeFields(state) }),
  { fetchTimeFields, selectTimeField },
)(IndexPatternTimeFields);
