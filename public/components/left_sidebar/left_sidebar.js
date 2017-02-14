import React from 'react';
import Sidebar from 'plugins/rework/components/sidebar/sidebar';
import ElementEditor from 'plugins/rework/components/element_editor/element_editor';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';

export default class LeftSidebar extends React.PureComponent {
  render() {
    const {isOpen, toggle, argumentSet, openElementDropDown, element} = this.props;

    return (
      <Sidebar position="left">
        {!this.props.isOpen ? null : (
          <div className="rework--editor--left">
            <ElementEditor
              element={this.props.element}
              openDropDown={this.props.openElementDropDown}
              argumentSet={this.props.argumentSet}>
            </ElementEditor>
          </div>
        )}

        <div className="rework--editor-toggle--left">
          <EditorToggle toggle={this.props.toggle} status={this.props.isOpen}></EditorToggle>
        </div>
      </Sidebar>
    );
  }
}
