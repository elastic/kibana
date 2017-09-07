import React, { Component, cloneElement } from 'react';
import { sortBy as sortByLodash } from 'lodash';

class SimplePropsWrap extends Component {
  componentWillMount() {
    const {
      change,
      transientId,
      wrappedProps,
      actions,
    } = this.props;

    change(transientId, wrappedProps);

    this.connectedActions = Object.keys(actions).reduce((connectedActions, actionName) => {
      connectedActions[actionName] = (...args) => change(transientId, actions[actionName](wrappedProps, ...args));
      return connectedActions;
    }, {});
  }

  render() {
    const {
      change,
      transientId,
      children,
      wrappedProps,
      ...rest,
    } = this.props;

    // console.log('SimplePropsWrap', wrappedProps, this.connectedActions);

    return cloneElement(this.props.children, {
      ...rest,
      ...this.connectedActions,
    });
  }
}

export const wrapWithSimpleProps = ({ props: wrappedProps, actions }) => {
  return (BaseComponent) => (props) => (
    <SimplePropsWrap wrappedProps={wrappedProps} actions={actions} {...props}>
      <BaseComponent/>
    </SimplePropsWrap>
  );
};
