import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { elementResolve, argumentResolve, elementSelect } from 'plugins/rework/state/actions/element';


/*
  This pseudo element interacts with state to writing the resolved
  value of arguments to the transient resolvedArg object.
*/

const ElementWrapper = React.createClass({
  select(id) {
    return (e) => {
      e.stopPropagation();
      const {dispatch} = this.props;
      dispatch(elementSelect(id));
    };
  },
  componentWillMount() {
    const {dispatch, id, args} = this.props;
    dispatch(elementResolve(id));
  },
  render() {
    const {id} = this.props;
    return (
      <div style={{height: '100%'}} tabIndex="0" onFocus={this.select(id)} className="rework--element-wrapper">
        {this.props.children}
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    elements: state.persistent.elements,
  };
}

export default connect(mapStateToProps)(ElementWrapper);
