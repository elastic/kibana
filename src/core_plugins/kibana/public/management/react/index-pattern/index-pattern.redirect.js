/* eslint-disable */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { config } from '../globals';

import IndexPatternCreate from './components/index-pattern-create';
import IndexPatternList from './components/index-pattern-list';

import {
  fetchIndexPatterns,
} from './components/index-pattern-list/lib/fetch-index-patterns';

class IndexPatternRoutes extends Component {
  async componentWillMount() {
    const { history } = this.props;
    const indexPatterns = await fetchIndexPatterns();
    if (indexPatterns.length > 0) {
      const defaultIndex = config.get('defaultIndex');
      const defaultIndexPattern = indexPatterns.find(pattern => pattern.id === defaultIndex);
      if (defaultIndexPattern) {
        // history.push(`/management/kibana/indices/${defaultIndex}`);
        // return;
      }
    }
    history.push('/management/kibana/index');
  }

  render() {
    return null;
  }
}

export default IndexPatternRoutes;
