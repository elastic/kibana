import { connect } from 'react-redux';
import { IndexPatternTimeFields as IndexPatternTimeFieldsComponent } from './index-pattern-time-fields.component';

import {
  fetchTimeFields,
  selectTimeField,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getTimeFields,
  getPattern,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

const IndexPatternTimeFields = connect(
  state => {
    return {
      ...getTimeFields(state),
      pattern: getPattern(state),
    };
  },
  { fetchTimeFields, selectTimeField },
)(IndexPatternTimeFieldsComponent);

export { IndexPatternTimeFields };
