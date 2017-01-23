import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

// Containers
import DropDown from 'plugins/rework/containers/drop_down/drop_down';
import Nav from 'plugins/rework/containers/nav/nav';
import ElementEditor from 'plugins/rework/containers/element_editor/element_editor';
import WorkpadContainer from 'plugins/rework/containers/workpad_container/workpad_container';

// Components
import Sidebar from 'plugins/rework/components/sidebar/sidebar';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';

// Actions
import { editorToggle } from 'plugins/rework/state/actions/editor';


import './app.less';

const App = React.createClass({

  do(action) {
    const {dispatch} = this.props;
    return () => dispatch(action());
  },
  render() {
    const  {elements, editor, selectedElement} = this.props;
    const {resizeMove, rotate, select} = this;
    const currentElement = elements[selectedElement];

    // TODO: This entire thing can be broken up into smaller containers.
    // But for now, its actually *more* readable this way.
    return (
      <div className="rework--application">
        <Nav></Nav>
        <DropDown></DropDown>

        <div className="rework--workspace">

          <Sidebar position="left">
            {!editor ? null : (
              <div className="rework--editor--left">
                <ElementEditor element={currentElement}></ElementEditor>
              </div>
            )}

            <div className="rework--editor-toggle--left">
              <EditorToggle toggle={this.do(editorToggle)} status={editor}></EditorToggle>
            </div>
            <div className="rework--editor-toggle--left">
              <EditorToggle toggle={this.do(editorToggle)} status={editor}></EditorToggle>
            </div>
          </Sidebar>

          <WorkpadContainer></WorkpadContainer>
        </div>
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
    elementCache: state.transient.elementCache,
    selectedElement: state.transient.selectedElement
  };
}

export default connect(mapStateToProps)(App);
