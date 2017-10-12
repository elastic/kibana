import { connect } from 'react-redux';
import { IndexPatternCreateDecorator } from './index-pattern-create.decorator';

import {
  createIndexPattern,
  fetchIndices,
} from 'plugins/kibana/management/react/store/actions';

import {
  getSearchHasExactMatches,
  getIsCreating,
  getSearchPattern,
  getTimeField,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternCreate = connect(
  state => ({
    hasExactMatches: getSearchHasExactMatches(state),
    isCreating: getIsCreating(state),
    pattern: getSearchPattern(state),
    timeFieldName: getTimeField(state),
  }),
  { createIndexPattern, fetchIndices },
)(IndexPatternCreateDecorator);

export { IndexPatternCreate };
