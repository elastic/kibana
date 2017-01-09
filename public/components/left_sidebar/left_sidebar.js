import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { editorToggle } from 'plugins/rework/state/actions';

export default React.createClass({
  render() {
    const style = {
      display: 'flex'
    };

    return (
      <div className="rework--left-sidebar" style={style}>
        {this.props.children}
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    editor: state.transient.editor
  };
}
