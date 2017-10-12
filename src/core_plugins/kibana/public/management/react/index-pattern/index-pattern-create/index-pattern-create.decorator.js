import React, { Component } from 'react';
import { IndexPatternCreate } from './index-pattern-create.component';

export class IndexPatternCreateDecorator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isIncludingSystemIndices: false,
    };
  }

  componentWillMount() {
    this.props.fetchIndices('*', true);
  }

  includeSystemIndices = () => this.setState({ isIncludingSystemIndices: true })
  excludeSystemIndices = () => this.setState({ isIncludingSystemIndices: false })

  render() {
    return (
      <IndexPatternCreate
        {...this.props}
        includeSystemIndices={this.includeSystemIndices}
        excludeSystemIndices={this.excludeSystemIndices}
        isIncludingSystemIndices={this.state.isIncludingSystemIndices}
      />
    );
  }
}
