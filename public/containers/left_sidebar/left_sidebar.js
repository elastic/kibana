import React from 'react';
import { connect } from 'react-redux';

import Sidebar from 'plugins/rework/components/sidebar/sidebar';
import ElementEditor from 'plugins/rework/components/element_editor/element_editor';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';
import {editorToggle} from 'plugins/rework/state/actions/editor';
import {dropdownOpen} from 'plugins/rework/state/actions/misc';
import {argumentSet} from 'plugins/rework/state/actions/element';

class LeftSidebar extends React.PureComponent {
  toggle() {
    this.props.dispatch(editorToggle());
  }

  openElementDropDown() {
    this.props.dispatch(dropdownOpen('element'));
  }

  argumentSet(id, name, value) {
    this.props.dispatch(argumentSet(id, name, value));
  }

  render() {

    const style = !this.props.isOpen ? {display: 'none'} : {};
    return (
      <Sidebar position="left">
        <div className="rework--editor--left" style={style}>
          <ElementEditor
            element={this.props.element}
            openDropDown={this.openElementDropDown.bind(this)}
            argumentSet={this.argumentSet.bind(this)}>
          </ElementEditor>
        </div>
        <div className="rework--editor-toggle--left">
          <EditorToggle toggle={this.toggle.bind(this)} status={this.props.isOpen}></EditorToggle>
        </div>
      </Sidebar>
    );
  }
}

function mapStateToProps(state) {
  return {
    isOpen: state.transient.editor,
    element: state.persistent.elements[state.transient.selectedElement],
  };
}


export default connect(mapStateToProps)(LeftSidebar);
