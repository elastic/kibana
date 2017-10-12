import { connect } from 'react-redux';

import { IndexPatternResultsDecorator } from './index-pattern-results.decorator';

import {
  getSearchIndicesFiltered,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternResults = connect(
  (state, ownProps) => ({ indices: getSearchIndicesFiltered(state, ownProps.isIncludingSystemIndices) }),
)(IndexPatternResultsDecorator);

export { IndexPatternResults };
