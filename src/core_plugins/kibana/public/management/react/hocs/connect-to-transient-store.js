import React, { Component, PropTypes, cloneElement } from 'react';
import { connect } from 'react-redux';
import { uniqueId } from 'lodash';

import {
  getTransient
} from 'plugins/kibana/management/react/reducers';

import {
  change,
  createItem,
} from 'plugins/kibana/management/react/store/actions/transient';

class Transient extends Component {
  constructor(props, context) {
    super(props, context);
    this.store = context.store;
  }

  componentWillMount() {
    this.store.dispatch(this.props.refSetter(this.props.transientId));
    this.props.createItem(this.props.transientId);
  }

  render() {
    const {
      children,
      change,
      transientId,
      propsFromState,
    } = this.props;

    return cloneElement(children, {
      change,
      transientId,
      ...propsFromState
    });
  }
}

Transient.contextTypes = {
  store: PropTypes.object,
};

const TransientRedux = connect(
  (state, ownProps) => ({ propsFromState: getTransient(state)[ownProps.transientId] }),
  { change, createItem }
)(Transient);

export const connectToTransientStore = ({ refSetter, id }) => {
  const transientId = id || uniqueId('transient_');
  return (BaseComponent) => (props) => {
    return (
      <TransientRedux refSetter={refSetter} transientId={transientId}>
        <BaseComponent {...props} />
      </TransientRedux>
    );
  }
};
