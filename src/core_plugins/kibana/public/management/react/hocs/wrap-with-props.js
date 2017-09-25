import React, { Component } from 'react';
import { mapValues } from 'lodash';

export const wrapWithProps = ({ props: wrappedProps, actions }) => {
  return BaseComponent => class extends Component {
    constructor(props) {
      super(props);
      this.state = { ...wrappedProps };
    }

    render() {
      const wrappedActions = mapValues(actions, action => () => this.setState(action()));
      return <BaseComponent {...this.props} {...this.state} {...wrappedActions}/>
    }
  }
};
