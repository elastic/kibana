import { connect } from 'react-redux';
import { omit } from 'lodash';
import { compose } from 'recompose';
import IndexPatternCreate from './index-pattern-create.component';

import {
  connectToTransientStore,
  wrapWithSimpleProps,
} from 'plugins/kibana/management/react/hocs';

import {
  createIndexPattern,
  setTransientId,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getCreation,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

export default compose(
  connect(
    state => ({ ...getCreation(state) }),
    { createIndexPattern },
  ),
  connectToTransientStore({ refSetter: setTransientId }),
  wrapWithSimpleProps({
    props: {
      isIncludingSystemIndices: false,
    },
    actions: {
      includeSystemIndices: (props) => ({ isIncludingSystemIndices: true }),
      excludeSystemIndices: (props) => ({ isIncludingSystemIndices: false }),
    }
  }),
)(IndexPatternCreate);
