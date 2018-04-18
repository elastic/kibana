import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { Header } from './components/header';
import { List } from './components/list';

export class IndexPatternList extends Component {
  static propTypes = {
    indexPatternCreationOptions: PropTypes.array.isRequired,
    defaultIndex: PropTypes.string,
    indexPatterns: PropTypes.array.isRequired,
  }

  render() {
    const { indexPatterns, indexPatternCreationOptions } = this.props;

    return(
      <Fragment>
        <div className="indexPatternList__headerWrapper">
          <Header indexPatternCreationOptions={indexPatternCreationOptions} />
        </div>
        <List indexPatterns={indexPatterns} />
      </Fragment>
    );
  }
}
