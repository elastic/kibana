import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Editor from 'plugins/rework/components/editor/editor.js';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle.js';

import Workpad from 'plugins/rework/components/workpad/workpad.js';
import LeftSidebar from 'plugins/rework/components/left_sidebar/left_sidebar.js';
import Centered from 'plugins/rework/components/centered/centered.js';

import './workspace.less';

const Workspace = React.createClass({
  render() {
    const  {editor} = this.props;
    const conditionalEditor = editor ? (
      <div className="rework--editor--left">
        <Editor></Editor>
      </div>
    ) : null;

    return (
      <div className="rework--workspace">
        <LeftSidebar>
          {conditionalEditor}
          <div className="rework--editor-toggle--left">
            <EditorToggle></EditorToggle>
          </div>
        </LeftSidebar>

        <Centered>
          <Workpad></Workpad>
        </Centered>
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
