import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { elementResolve, argumentResolve } from 'plugins/rework/state/actions/element';


/*
  This pseudo element interacts with state to writing the resolved
  value of arguments to the transient resolvedArg object.
*/

const ElementResolver = React.createClass({
  componentWillMount() {
    const {dispatch, id, args} = this.props;
    dispatch(elementResolve(id));
  },
  render() {
    return this.props.children;
  }
});

function mapStateToProps(state) {
  return {
    elements: state.persistent.elements,
  };
}

export default connect(mapStateToProps)(ElementResolver);
