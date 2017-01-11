import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import LeftSidebar from 'plugins/rework/components/left_sidebar/left_sidebar';
import Editor from 'plugins/rework/components/editor/editor';
import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';
import Centered from 'plugins/rework/components/centered/centered';
import PageControl from 'plugins/rework/components/page_control/page_control';
import Workpad from 'plugins/rework/components/workpad/workpad';
import Stack from 'plugins/rework/components/stack/stack';
import Page from 'plugins/rework/components/page/page';
import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';
import { editorToggle, workpadPageNext, workpadPagePrevious } from 'plugins/rework/state/actions';
import { elementTop, elementLeft, elementHeight, elementWidth, elementAngle } from 'plugins/rework/state/actions';


import './workspace.less';

const Workspace = React.createClass({
  resizeMove(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {top, left, height, width} = e.interaction.absolute;

      dispatch(elementTop(id, top));
      dispatch(elementLeft(id, left));
      dispatch(elementHeight(id, height));
      dispatch(elementWidth(id, width));
    };
  },
  rotate(id) {
    return (e) => {
      const {dispatch} = this.props;
      const {angle} = e.interaction.absolute;
      dispatch(elementAngle(id, angle));
    };
  },
  do(action) {
    const {dispatch} = this.props;
    return () => dispatch(action());
  },
  render() {
    const  {workpad, pages, elements, dataframes, editor, resolvedArgs} = this.props;

    return (
      <div className="rework--workspace">
        <LeftSidebar>
          {!editor ? null : (
            <div className="rework--editor--left">
              <Editor></Editor>
            </div>
          )}
          <div className="rework--editor-toggle--left">
            <EditorToggle toggle={this.do(editorToggle)} status={editor}></EditorToggle>
          </div>
        </LeftSidebar>

        <Centered>
          <PageControl direction='previous' handler={this.do(workpadPagePrevious)}></PageControl>
          <Workpad workpad={workpad}>
            <Stack top={workpad.page}>
              {workpad.pages.map((pageId) => {
                const page = pages[pageId];
                return (
                  <Page key={pageId} page={page}>
                    {page.elements.map((elementId) => {
                      const element = elements[elementId];
                      const args = resolvedArgs[elementId];
                      const position = _.pick(element, ['top', 'left', 'height', 'width', 'angle']);
                      const {resizeMove, rotate} = this;
                      return (
                        <Positionable
                          key={elementId}
                          position={position}
                          move={resizeMove(elementId)}
                          resize={resizeMove(elementId)}
                          rotate={rotate(elementId)}>
                          <Element type={element.type} args={args}></Element>
                        </Positionable>
                      );
                    })}
                  </Page>
                );
              })}
            </Stack>
          </Workpad>
          <PageControl direction='next' handler={this.do(workpadPageNext)}></PageControl>
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
    resolvedArgs: state.transient.resolvedArgs
  };
}

export default connect(mapStateToProps)(Workspace);
