import { compose } from 'recompose';
import { connect } from 'react-redux';

import {
  wrapWithTableProps,
} from 'plugins/kibana/management/react/hocs';

import { IndexPatternResults as IndexPatternResultsComponent } from './index-pattern-results.component';

import {
  getResults,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

const IndexPatternResults = compose(
  connect(
    (state, ownProps) => {
      const results = getResults(state);
      const { isIncludingSystemIndices } = ownProps;

      const indices = results.indices
        ? results.indices.filter(item => item.name[0] !== '.' || isIncludingSystemIndices)
        : undefined;

      return {
        ...results,
        indices,
      };
    },
  ),
  wrapWithTableProps({
    perPage: 10,
    page: 0,
    sortBy: 'name',
    sortAsc: true,
    itemsKey: 'indices',
  })
)(IndexPatternResultsComponent);

export { IndexPatternResults };
