import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import classnames from 'classnames';

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
import { editorToggle } from 'plugins/rework/state/actions/editor';
import { elementTop, elementLeft, elementHeight, elementWidth, elementAngle } from 'plugins/rework/state/actions/element';
import { pageNext, pagePrevious } from 'plugins/rework/state/actions/page';

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
    const  {workpad, pages, elements, dataframes, editor, resolvedArgs, selectedElement} = this.props;

    // TODO: This entire thing can be broken up into smaller containers.
    // But for now, its actually *more* readable this way.
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
          <PageControl direction='previous' handler={this.do(pagePrevious)}></PageControl>
          <Workpad workpad={workpad}>
            <Stack top={workpad.page}>
              {workpad.pages.map((pageId) => {
                const page = pages[pageId];
                return (
                  <Page key={pageId} page={page}>
                    {page.elements.map((elementId) => {
                      const {resizeMove, rotate} = this;
                      const element = elements[elementId];
                      const selected = elementId === selectedElement ? true : false;
                      const args = resolvedArgs[elementId];
                      const position = _.pick(element, ['top', 'left', 'height', 'width', 'angle']);

                      // This is really gross because it doesn't actually wrap the element.
                      // Rather you end up with a bunch of 0 height divs stacked at the top
                      // of the page. Ew.
                      const wrapperClasses = classnames({
                        'rework--workspace-element-wrapper': true,
                        'rework--workspace-element-wrapper-selected': selected,
                      });
                      return (
                        <div key={elementId} className={wrapperClasses}>
                          <Positionable
                            position={position}
                            move={resizeMove(elementId)}
                            resize={resizeMove(elementId)}
                            rotate={rotate(elementId)}>
                            <Element type={element.type} args={args}></Element>
                          </Positionable>
                        </div>
                      );
                    })}
                  </Page>
                );
              })}
            </Stack>
          </Workpad>
          <PageControl direction='next' handler={this.do(pageNext)}></PageControl>
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
    resolvedArgs: state.transient.resolvedArgs,
    selectedElement: state.transient.selectedElement
  };
}

export default connect(mapStateToProps)(Workspace);
