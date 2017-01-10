import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import Editor from 'plugins/rework/components/editor/editor.js';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle.js';

import Workpad from 'plugins/rework/components/workpad/workpad.js';
import LeftSidebar from 'plugins/rework/components/left_sidebar/left_sidebar.js';
import Centered from 'plugins/rework/components/centered/centered.js';
import PageControl from 'plugins/rework/components/page_control/page_control';


import './workspace.less';

const Workspace = React.createClass({
  render() {
    const  {workpad, pages, elements, dataframes, editor} = this.props;

    return (
      <div className="rework--workspace">
        <LeftSidebar>
          {editor ? (
            <div className="rework--editor--left">
              <Editor></Editor>
            </div>
          ) : null}
          <div className="rework--editor-toggle--left">
            <EditorToggle></EditorToggle>
          </div>
        </LeftSidebar>

        <Centered>
          <PageControl direction='previous'></PageControl>
          <Workpad workpad={workpad} pages={pages} elements={elements}></Workpad>
          <PageControl direction='next'></PageControl>
        </Centered>
      </div>
    );
  }
});

function mapStateToProps(state) {
  return {
    editor: state.transient.editor,
    workpad: state.persistent.workpad,
    pages: state.persistent.pages,
    elements: state.persistent.elements,
  };
}

export default connect(mapStateToProps)(Workspace);
