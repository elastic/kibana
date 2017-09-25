import { connect } from 'react-redux';
import { omit } from 'lodash';
import { compose } from 'recompose';
import IndexPatternCreate from './index-pattern-create.component';

import {
  wrapWithProps,
} from 'plugins/kibana/management/react/hocs';

import {
  createIndexPattern,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getCreation,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

export default compose(
  connect(
    state => ({ ...getCreation(state) }),
    { createIndexPattern },
  ),
  wrapWithProps({
    props: {
      isIncludingSystemIndices: false,
    },
    actions: {
      includeSystemIndices: () => ({ isIncludingSystemIndices: true }),
      excludeSystemIndices: () => ({ isIncludingSystemIndices: false }),
    }
  }),
)(IndexPatternCreate);
