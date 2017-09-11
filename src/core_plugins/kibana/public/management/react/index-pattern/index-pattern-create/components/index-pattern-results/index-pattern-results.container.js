import { compose } from 'recompose';
import { connect } from 'react-redux';
import { connectToTransientStore } from 'plugins/kibana/management/react/hocs/connect-to-transient-store';
import { wrapWithSortProps } from 'plugins/kibana/management/react/hocs/wrap-with-sort-props';
import { wrapWithPaginateProps } from 'plugins/kibana/management/react/hocs/wrap-with-paginate-props';
import IndexPatternResults from './index-pattern-results.component';

import {
  setTransientTableId,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getFilteredAndPaginatedIndices,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

import {
  getIndexPatternCreate,
} from 'plugins/kibana/management/react/reducers';

export default compose(
  connect(
    state => {
      const indexPatternState = getIndexPatternCreate(state);

      // Is it weird to do this here?
      const items = indexPatternState.results.items
        ? indexPatternState.results.items.filter(item => item.name[0] !== '.' || indexPatternState.isIncludingSystemIndices)
        : undefined;

      return {
        ...indexPatternState.results,
        items,
      };
    },
  ),
  connectToTransientStore({
    refSetter: setTransientTableId,
    id: 'creation_results'
  }),
  wrapWithSortProps(),
  wrapWithPaginateProps({ perPage: 10, page: 0 }),
)(IndexPatternResults);
