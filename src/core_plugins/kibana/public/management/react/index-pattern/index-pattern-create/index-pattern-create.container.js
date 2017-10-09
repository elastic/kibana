import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { IndexPatternCreate as IndexPatternCreateComponent } from './index-pattern-create.component';

import {
  wrapWithProps,
} from 'plugins/kibana/management/react/hocs';

import {
  createIndexPattern,
  fetchIndices,
} from 'plugins/kibana/management/react/store/actions/index-pattern-creation';

import {
  getCreation,
} from 'plugins/kibana/management/react/store/reducers/index-pattern-creation';

const IndexPatternCreate = compose(
  connect(
    state => ({ ...getCreation(state) }),
    { createIndexPattern, fetchIndices },
  ),
  wrapWithProps({
    props: {
      isIncludingSystemIndices: false,
    },
    actions: {
      includeSystemIndices: () => ({ isIncludingSystemIndices: true }),
      excludeSystemIndices: () => ({ isIncludingSystemIndices: false }),
    }
  }),
)(class extends Component {
  componentWillMount() {
    this.props.fetchIndices('*', true);
  }
  render() {
    return <IndexPatternCreateComponent {...this.props}/>;
  }
});

export { IndexPatternCreate };
