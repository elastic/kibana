import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import { editorToggle } from 'plugins/rework/state/actions';
import './workspace.less';

const Workspace = React.createClass({
  editorToggle() {
    const { dispatch } = this.props;
    dispatch(editorToggle());
  },
  render() {
    return (
      <div className="rework--workspace">
        {this.props.editor ? 'YES' : 'NO'}
        <button onClick={this.editorToggle}>Editor</button>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    editor: state.transient.editor
  };
}

export default connect(mapStateToProps)(Workspace);
