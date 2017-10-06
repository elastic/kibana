import { connect } from 'react-redux';
import { compose } from 'recompose';
import { IndexPatternList as IndexPatternListComponent } from './index-pattern-list.component';

import {
  wrapWithTableProps,
} from 'plugins/kibana/management/react/hocs';

import {
  fetchIndexPatterns,
} from 'plugins/kibana/management/react/store/actions/index-pattern-list';

import {
  getIndexPatternList,
} from 'plugins/kibana/management/react/reducers';

const IndexPatternList = compose(
  connect(
    state => ({ ...getIndexPatternList(state) }),
    { fetchIndexPatterns }
  ),
  wrapWithTableProps({
    filters: {
      ['attributes.title']: (value, filterValue) => !filterValue || value.includes(filterValue),
    },
    sortBy: 'attributes.title',
    sortAsc: true,
    perPage: 10,
    page: 0,
  })
)(IndexPatternListComponent);

export { IndexPatternList };
