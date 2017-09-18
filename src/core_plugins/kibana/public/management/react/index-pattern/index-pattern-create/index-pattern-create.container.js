import { connect } from 'react-redux';
import { omit } from 'lodash';
import { compose } from 'recompose';
import IndexPatternCreate from './index-pattern-create.component';

import {
  wrapWithSimpleProps,
} from 'plugins/kibana/management/react/hocs';

import {
  createIndexPattern,
  change,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getCreation,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));

export default compose(
  connect(
    state => ({ ...getCreation(state) }),
    { createIndexPattern },
  ),
  wrapWithSimpleProps({
    action,
    props: {
      isIncludingSystemIndices: false,
    },
    actions: {
      includeSystemIndices: (props) => ({ isIncludingSystemIndices: true }),
      excludeSystemIndices: (props) => ({ isIncludingSystemIndices: false }),
    }
  }),
)(IndexPatternCreate);
