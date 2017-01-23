import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import classnames from 'classnames';

import TopNav from 'plugins/rework/components/top_nav/top_nav';
import DropDown from 'plugins/rework/containers/drop_down/drop_down';
import Sidebar from 'plugins/rework/components/sidebar/sidebar';
import NavButton from 'plugins/rework/components/nav_button/nav_button';
import Editable from 'plugins/rework/components/editable/editable';

import EditorToggle from 'plugins/rework/components/editor_toggle/editor_toggle';
import Centered from 'plugins/rework/components/centered/centered';
import Pager from 'plugins/rework/components/pager/pager';
import PageManager from 'plugins/rework/components/page_manager/page_manager';
import Workpad from 'plugins/rework/components/workpad/workpad';
import Stack from 'plugins/rework/components/stack/stack';
import Page from 'plugins/rework/components/page/page';
import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';
import ElementWrapper from 'plugins/rework/containers/element_wrapper/element_wrapper';
import ElementEditor from 'plugins/rework/containers/element_editor/element_editor';

import { dropdownToggle } from 'plugins/rework/state/actions/misc';
import { editorToggle } from 'plugins/rework/state/actions/editor';
import { pageNext, pagePrevious, pageAdd, pageRemove } from 'plugins/rework/state/actions/page';
import { elementSelect, elementTop, elementLeft, elementHeight, elementWidth, elementAngle } from 'plugins/rework/state/actions/element';
import { workpadName, workpadNew } from 'plugins/rework/state/actions/workpad';

import './workspace.less';

const Workspace = React.createClass({
  pageAdd() {
    this.props.dispatch(pageAdd());
  },
  pageRemove() {
    const {page, pages} = this.props.workpad;
    this.props.dispatch(pageRemove(pages[page]));
  },
  nameWorkpad(value) {
    this.props.dispatch(workpadName(value));
  },
  newWorkpad() {
    this.props.dispatch(workpadNew());
  },
  dropdown(name) {
    return () => {
      this.props.dispatch(dropdownToggle(name));
    };
  },
  select(id) {
    return (e) => {
      e.stopPropagation();
      this.props.dispatch(elementSelect(id));
    };
  },
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
    const  {workpad, pages, elements, dataframes, editor, elementCache, selectedElement} = this.props;
    const {resizeMove, rotate, select} = this;
    const currentElement = elements[selectedElement];

    // TODO: This entire thing can be broken up into smaller containers.
    // But for now, its actually *more* readable this way.
    return (
      <div className="rework--application">
        <TopNav>
          <div className="rework--top-nav-top">
            <Editable className="rework--workpad-name" onChange={this.nameWorkpad} value={workpad.name}></Editable>
          </div>
          <div className="rework--top-nav-bottom">
            <NavButton
              tooltip="Dataframes"
              className="fa fa-database"
              onClick={this.dropdown('dataframe')}></NavButton>
            <NavButton
              tooltip="Add Element"
              className="fa fa-plus-circle"
              onClick={this.dropdown('element')}></NavButton>
            <NavButton
              tooltip="New Workpad"
              className="fa fa-star"
              onClick={this.newWorkpad}></NavButton>

          </div>
        </TopNav>
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

          <Centered onMouseDown={this.select(null)}>
            <Pager direction='previous' handler={this.do(pagePrevious)}></Pager>
            <Workpad workpad={workpad}>
                <PageManager add={this.pageAdd} remove={this.pageRemove}></PageManager>
                <Stack top={workpad.page}>
                  {workpad.pages.map((pageId) => {
                    const page = pages[pageId];
                    return (
                      <Page key={pageId} page={page}>
                        {page.elements.map((elementId) => {
                          const element = elements[elementId];
                          const selected = elementId === selectedElement ? true : false;
                          const position = _.pick(element, ['top', 'left', 'height', 'width', 'angle']);

                          // This is really gross because it doesn't actually wrap the element.
                          // Rather you end up with a bunch of 0 height divs stacked at the top
                          // of the page. Ew.
                          const wrapperClasses = classnames({
                            'rework--workspace-element-header': true,
                            'rework--workspace-element-header-selected': selected,
                          });
                          return (
                            <div key={elementId} className={wrapperClasses}>
                              <ElementWrapper id={elementId} args={element.args}>
                                <Positionable
                                  position={position}
                                  move={resizeMove(elementId)}
                                  resize={resizeMove(elementId)}
                                  rotate={rotate(elementId)}>
                                    <Element type={element.type} args={elementCache[elementId]}></Element>
                                </Positionable>
                              </ElementWrapper>

                            </div>
                          );
                        })}
                      </Page>
                    );
                  })}
                </Stack>
            </Workpad>
            <Pager direction='next' handler={this.do(pageNext)}></Pager>
          </Centered>
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

export default connect(mapStateToProps)(Workspace);
