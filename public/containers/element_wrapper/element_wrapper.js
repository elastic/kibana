import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { elementSelect, elementRemove } from 'plugins/rework/state/actions/element';

const ElementWrapper = React.createClass({
  select(id) {
    return (e) => {
      e.stopPropagation();
      const {dispatch} = this.props;
      dispatch(elementSelect(id));
    };
  },
  handleKeypress(e) {
    const {dispatch, id, pageId} = this.props;
    if (e.keyCode === 8 || e.keyCode === 46) {
      dispatch(elementRemove(id, pageId));
    }
  },
  render() {
    const {id} = this.props;
    return (
      <div
        style={{height: '100%'}}
        tabIndex="0"
        onFocus={this.select(id)}
        id={id}
        onKeyDown={this.handleKeypress}
        className="rework--element-wrapper">
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
