import { compose } from 'recompose';
import { connect } from 'react-redux';

import {
  wrapWithSortProps,
  wrapWithPaginateProps,
  wrapWithFilterProps,
} from 'plugins/kibana/management/react/hocs';

import IndexPatternResults from './index-pattern-results.component';

import {
  setTransientTableId,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getFilteredAndPaginatedIndices,
  getPathToIndices,
  getIsIncludingSystemIndices,
  getPathToResults,
  getResults,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

import {
  getIndexPatternCreate,
} from 'plugins/kibana/management/react/reducers';

import store from 'plugins/kibana/management/react/store';

const action = (...args) => store.dispatch(change(...args));
const commonOpts = {
  itemsPath: getPathToResults(),
  action,
};

export default compose(
  connect(
    state => {
      const results = getResults(state);
      const isIncludingSystemIndices = getIsIncludingSystemIndices(state);

      // Is it weird to do this here?
      const indices = results.indices
        ? results.indices.filter(item => item.name[0] !== '.' || isIncludingSystemIndices)
        : undefined;

      return {
        ...results,
        indices,
      };
    },
  ),
  wrapWithSortProps({
    ...commonOpts,
    sortBy: 'name',
    sortAsc: true,
  }),
  wrapWithPaginateProps({
    ...commonOpts,
    perPage: 10,
    page: 0
  }),
)(IndexPatternResults);
