import { connect } from 'react-redux';
import { compose } from 'recompose';
import { IndexPatternFields as IndexPatternFieldsComponent } from './index-pattern-fields.component';

import {
  wrapWithTableProps,
} from 'plugins/kibana/management/react/hocs';

import {
  getPathToFields,
}  from 'plugins/kibana/management/react/store/reducers/index-pattern-view';

import {
  getIndexPatternView,
} from 'plugins/kibana/management/react/reducers';

const IndexPatternFields = compose(
  connect(
    state => ({ ...getIndexPatternView(state) }),
  ),
  wrapWithTableProps({
    perPage: 10,
    page: 0,
    sortBy: 'name',
    sortAsc: true,
    filters: {
      name: (value, filterValue) => !filterValue || value.includes(filterValue),
      type: (value, filterValue) => !filterValue || filterValue === 'false' || value === filterValue,
    },
    itemsKey: getPathToFields(),
  })
)(IndexPatternFieldsComponent);

export { IndexPatternFields };
