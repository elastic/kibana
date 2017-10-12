import React, { Component } from 'react';
import { IndexPatternResults } from './index-pattern-results.component';

import {
  collectionManager,
} from 'plugins/kibana/management/react/lib/collection_manager';

export class IndexPatternResultsDecorator extends Component {
  constructor(props) {
    super(props);

    this.state = {
      indices: props.indices,
      numOfPages: props.numOfPages,
    };

    this.collectionManager = collectionManager(
      props.indices,
      function filter(item, filterBy) {
        return !filterBy.name || item.name.includes(filterBy.name);
      },
      {
        sortBy: 'name',
        sortAsc: true
      }
    );

    this.collectionManager.watchForItems(({ items, numOfPages }) => {
      this.setState({
        indices: items,
        numOfPages
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    this.collectionManager.setItems(nextProps.indices);
  }

  render() {
    return (
      <IndexPatternResults
        {...this.props}
        {...this.collectionManager.getMutateMethods()}
        indices={this.state.indices}
        numOfPages={this.state.numOfPages}
      />
    );
  }
}
