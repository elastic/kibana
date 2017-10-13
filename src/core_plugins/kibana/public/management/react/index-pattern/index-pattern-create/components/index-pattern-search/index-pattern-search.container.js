import { connect } from 'react-redux';
import { IndexPatternSearch as IndexPatternSearchComponent } from './index-pattern-search.component';

import {
  fetchIndices,
} from 'plugins/kibana/management/react/store/actions/indices';

import {
  getSearchHasExactMatches,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternSearch = connect(
  state => ({ hasExactMatches: getSearchHasExactMatches(state) }),
  { fetchIndices },
)(IndexPatternSearchComponent);

export { IndexPatternSearch };
