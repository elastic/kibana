import React, { Component } from 'react';
import { connect } from 'react-redux';
import { IndexPatternCreate as IndexPatternCreateComponent } from './index-pattern-create.component';

import {
  CustomProps,
} from 'plugins/kibana/management/react/lib/custom_props';

import {
  createIndexPattern,
  fetchIndices,
} from 'plugins/kibana/management/react/store/actions';

import {
  getSearchHasExactMatches,
  getIsCreating,
} from 'plugins/kibana/management/react/store/reducers';

const IndexPatternCreate = connect(
  state => ({
    hasExactMatches: getSearchHasExactMatches(state),
    isCreating: getIsCreating(state),
  }),
  { createIndexPattern, fetchIndices },
)(class extends Component {
  componentWillMount() {
    this.props.fetchIndices('*', true);
  }

  render() {
    return (
      <CustomProps
        props={{ isIncludingSystemIndices: false }}
        actions={{
          includeSystemIndices: () => ({ isIncludingSystemIndices: true }),
          excludeSystemIndices: () => ({ isIncludingSystemIndices: false }),
        }}
        render={(customProps) => (
          <IndexPatternCreateComponent
            {...customProps}
            {...this.props}
          />
        )}
      />
    );
  }
});

export { IndexPatternCreate };
