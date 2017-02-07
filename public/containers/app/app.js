import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

// Containers
import DropDown from 'plugins/rework/containers/drop_down/drop_down';
import Nav from 'plugins/rework/containers/nav/nav';
import ElementEditor from 'plugins/rework/components/element_editor/element_editor';
import WorkpadContainer from 'plugins/rework/containers/workpad_container/workpad_container';

// Components
import Sidebar from 'plugins/rework/components/sidebar/sidebar';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';

// Actions
import { editorToggle } from 'plugins/rework/state/actions/editor';
import { dropdownOpen } from 'plugins/rework/state/actions/misc';



import './app.less';

const App = React.createClass({
  openElementDropDown() {
    this.props.dispatch(dropdownOpen('element'));
  },
  do(action) {
    const {dispatch} = this.props;
    return () => dispatch(action());
  },
  render() {
    const  {elements, editor, selectedElement, fullscreen} = this.props;
    const {resizeMove, rotate, select} = this;
    const currentElement = elements[selectedElement];

    const workpadContainerElem = (<WorkpadContainer></WorkpadContainer>);


    // TODO: This entire thing can be broken up into smaller containers.
    // But for now, its actually *more* readable this way.
    if (fullscreen) return workpadContainerElem;

    return (
      <div className="rework--application">
        <Nav></Nav>
        <DropDown></DropDown>

        <div className="rework--workspace">

          <Sidebar position="left">
            {!editor ? null : (
              <div className="rework--editor--left">
                <ElementEditor element={currentElement} openDropDown={this.openElementDropDown}></ElementEditor>
              </div>
            )}

            <div className="rework--editor-toggle--left">
              <EditorToggle toggle={this.do(editorToggle)} status={editor}></EditorToggle>
            </div>
            <div className="rework--editor-toggle--left">
              <EditorToggle toggle={this.do(editorToggle)} status={editor}></EditorToggle>
            </div>
          </Sidebar>

          {workpadContainerElem}

        </div>
      </div>

    );
  }
});

function mapStateToProps(state) {
  return {
    editor: state.transient.editor,
    elements: state.persistent.elements,
    selectedElement: state.transient.selectedElement,
    fullscreen: state.transient.fullscreen,
  };
}

export default connect(mapStateToProps)(App);
