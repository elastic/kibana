import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import classnames from 'classnames';

// Components
import Centered from 'plugins/rework/components/centered/centered';
import Pager from 'plugins/rework/components/pager/pager';
import PageManager from 'plugins/rework/components/page_manager/page_manager';
import Workpad from 'plugins/rework/components/workpad/workpad';
import Stack from 'plugins/rework/components/stack/stack';
import Page from 'plugins/rework/components/page/page';
import Positionable from 'plugins/rework/components/positionable/positionable';
import Element from 'plugins/rework/components/element/element';

// Containers
import ElementWrapper from 'plugins/rework/containers/element_wrapper/element_wrapper';

import { pageNext, pagePrevious, pageAdd, pageRemove } from 'plugins/rework/state/actions/page';
import { elementSelect, elementTop, elementLeft, elementHeight, elementWidth, elementAngle } from 'plugins/rework/state/actions/element';

const DataframeDialog = React.createClass({
  pageAdd() {
    this.props.dispatch(pageAdd());
  },
  pageRemove() {
    const {page, pages} = this.props.workpad;
    this.props.dispatch(pageRemove(pages[page]));
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
    const {workpad, elements, selectedElement, pages, elementCache} = this.props;
    const {rotate, resizeMove} = this;

    return (
      <Centered onMouseDown={this.select(null)}>
        <Pager direction='previous' handler={this.do(pagePrevious)}></Pager>
        <Workpad workpad={workpad}>
            <PageManager add={this.pageAdd} remove={this.pageRemove} pageCount={workpad.pages.length}></PageManager>
            <Stack top={workpad.page}>
              {workpad.pages.map((pageId) => {
                const page = pages[pageId];
                return (
                  <Page key={pageId} page={page}>
                    {page.elements.map((elementId, i) => {
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
                            <Positionable style={{zIndex: 2000 + i}}
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
    );
  }
});

function mapStateToProps(state) {
  return {
    workpad: state.persistent.workpad,
    pages: state.persistent.pages,
    elements: state.persistent.elements,
    elementCache: state.transient.elementCache,
    selectedElement: state.transient.selectedElement
  };
}

export default connect(mapStateToProps)(DataframeDialog);
