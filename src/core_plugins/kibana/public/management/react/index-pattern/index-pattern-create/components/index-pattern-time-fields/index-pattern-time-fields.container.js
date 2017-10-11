import { connect } from 'react-redux';
import { IndexPatternTimeFields as IndexPatternTimeFieldsComponent } from './index-pattern-time-fields.component';

import {
  fetchTimeFields,
  selectTimeField,
} from 'plugins/kibana/management/react/store/actions';

import {
  getTimeFields,
  getSearchPattern,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternTimeFields = connect(
  state => ({
    timeFields: getTimeFields(state),
    pattern: getSearchPattern(state),
  }),
  { fetchTimeFields, selectTimeField },
)(IndexPatternTimeFieldsComponent);

export { IndexPatternTimeFields };
