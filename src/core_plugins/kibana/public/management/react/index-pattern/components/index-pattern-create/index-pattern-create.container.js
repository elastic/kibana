/* eslint-disable */
import { connect } from 'react-redux';
import IndexPatternCreate from './index-pattern-create.component';

import {
  includeSystemIndices,
  excludeSystemIndices,
  createIndexPattern,
} from '../../../store/actions/index-pattern-creation';

import {
  getIndexPatternCreate,
} from '../../../reducers';

export default connect(
  state => {
    const {
      isIncludingSystemIndices,
      isCreating,
      results: {
        hasExactMatches,
      }
    } = getIndexPatternCreate(state);

    return { isIncludingSystemIndices, isCreating, hasExactMatches };
  },
  { includeSystemIndices, excludeSystemIndices, createIndexPattern },
)(IndexPatternCreate);
