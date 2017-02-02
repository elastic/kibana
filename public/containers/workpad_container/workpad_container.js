import React from 'react';
import { connect } from 'react-redux';
import _ from 'lodash';
import classnames from 'classnames';
import $ from 'jquery';

// Components
import Centered from 'plugins/rework/components/centered/centered';
import Pager from 'plugins/rework/components/pager/pager';
import PageManager from 'plugins/rework/components/page_manager/page_manager';
import Workpad from 'plugins/rework/components/workpad/workpad';
import Stack from 'plugins/rework/components/stack/stack';
import Page from 'plugins/rework/components/page/page';
import Fullscreen from 'plugins/rework/components/fullscreen/fullscreen';
import Presentation from 'plugins/rework/components/presentation/presentation';


// Containers
import ElementWrapper from 'plugins/rework/containers/element_wrapper/element_wrapper';

import { fullscreenToggle } from 'plugins/rework/state/actions/misc';
import { pageNext, pagePrevious, pageAdd, pageRemove, pageReplace } from 'plugins/rework/state/actions/page';
import { workpadReplace } from 'plugins/rework/state/actions/workpad';

import { elementSelect } from 'plugins/rework/state/actions/element';

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
  do(action) {
    const {dispatch} = this.props;
    return () => dispatch(action());
  },
  changePage(page) {
    this.props.dispatch(pageReplace(page));
  },
  changeWorkpad(workpad) {
    this.props.dispatch(workpadReplace(workpad));
  },
  render() {
    const {fullscreen, workpad, elements, selectedElement, pages, elementCache} = this.props;
    const {rotate, resizeMove} = this;
    const currentPage = pages[workpad.pages[workpad.page]];

    const stack = (
      <Stack top={workpad.page}>
        {workpad.pages.map((pageId) => {
          const page = pages[pageId];
          return (
            <Page key={pageId} page={page}>
              {page.elements.map((elementId, i) => {
                const element = elements[elementId];
                const selected = elementId === _.get(selectedElement, 'id') ? true : false;
                const position = _.pick(selectedElement, ['top', 'left', 'height', 'width', 'angle']);

                // This is really gross because it doesn't actually wrap the element.
                // Rather you end up with a bunch of 0 height divs stacked at the top
                // of the page. Ew.
                const wrapperClasses = classnames({
                  'rework--workspace-element-header': true,
                  'rework--workspace-element-header-selected': selected,
                });
                return (
                  <div key={elementId} className={wrapperClasses}>
                    <ElementWrapper element={element} page={page} layer={i}></ElementWrapper>
                  </div>
                );
              })}
            </Page>
          );
        })}
      </Stack>
    );



    if (fullscreen) {
      return (
        <Fullscreen height={workpad.height} width={workpad.width}>
          <Presentation onNext={this.do(pageNext)} onPrev={this.do(pagePrevious)} onEsc={this.do(fullscreenToggle)}>
            <Centered>
              <Workpad workpad={workpad}>
                {stack}
              </Workpad>
            </Centered>
          </Presentation>
        </Fullscreen>
      );
    } else {
      return (
        <div style={{overflow: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column'}} onMouseDown={this.select(null)}>
            <div style={{margin: 'auto'}}>
              <div className="rework--workspace-upper" style={{textAlign: 'center', padding: '10px 0', height: '60px'}}>
                <PageManager
                  add={this.pageAdd}
                  remove={this.pageRemove}
                  pageCount={workpad.pages.length}
                  page={currentPage}
                  onPageChange={this.changePage}
                  workpad={workpad}
                  onWorkpadChange={this.changeWorkpad}>
                </PageManager>
              </div>
              <div className="rework--workspace-lower" style={{margin: 'auto'}}>
                <Centered>
                  <Pager direction='previous' handler={this.do(pagePrevious)}></Pager>
                  <Workpad workpad={workpad}>
                      {stack}
                  </Workpad>
                  <Pager direction='next' handler={this.do(pageNext)}></Pager>
                </Centered>
              </div>
            </div>
        </div>
      );
    }
  }
});

function mapStateToProps(state) {
  return {
    workpad: state.persistent.workpad,
    pages: state.persistent.pages,
    selectedElement: state.persistent.elements[state.transient.selectedElement],
    elements: state.persistent.elements,
    elementCache: state.transient.elementCache,
    fullscreen: state.transient.fullscreen
  };
}

export default connect(mapStateToProps)(DataframeDialog);
