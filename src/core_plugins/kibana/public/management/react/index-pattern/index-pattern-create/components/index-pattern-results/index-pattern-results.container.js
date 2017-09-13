import { compose } from 'recompose';
import { connect } from 'react-redux';

import {
  connectToTransientStore,
  wrapWithSortProps,
  wrapWithPaginateProps,
  wrapWithFilterProps,
  rename,
} from 'plugins/kibana/management/react/hocs';

import IndexPatternResults from './index-pattern-results.component';

import {
  setTransientTableId,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getFilteredAndPaginatedIndices,
  getPathToIndices,
  getTransientId,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

import {
  getIndexPatternCreate,
  getTransient,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => {
      const indexPatternState = getIndexPatternCreate(state);
      const transientId = getTransientId(state);
      const transientState = getTransient(state)[transientId];

      // Is it weird to do this here?
      const indices = indexPatternState.results.indices
        ? indexPatternState.results.indices.filter(item => item.name[0] !== '.' || transientState.isIncludingSystemIndices)
        : undefined;

      return {
        ...indexPatternState.results,
        indices,
      };
    },
  ),
  connectToTransientStore({
    refSetter: setTransientTableId,
    id: 'creation_results'
  }),
  rename({ from: 'indices', to: 'items' }),
  wrapWithSortProps(),
  wrapWithPaginateProps({ perPage: 10, page: 0 }),
)(IndexPatternResults);
