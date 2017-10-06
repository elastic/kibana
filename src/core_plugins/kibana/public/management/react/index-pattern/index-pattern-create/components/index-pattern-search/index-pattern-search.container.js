import { connect } from 'react-redux';
import { IndexPatternSearch as IndexPatternSearchComponent } from './index-pattern-search.component';

import {
  fetchIndices,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getResults,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

const IndexPatternSearch = connect(
  state => {
    const { hasExactMatches } = getResults(state);
    return { hasExactMatches };
  },
  { fetchIndices },
)(IndexPatternSearchComponent);

export { IndexPatternSearch };
