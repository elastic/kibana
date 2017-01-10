import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import Page from 'plugins/rework/components/page/page';
import './workpad.less';

export default React.createClass({
  render() {
    const {workpad, pages, elements, dataframes} = this.props;
    const {height, width} = workpad;
    const currentPage = workpad.page;
    const orderedPages = workpad.pages;

    const style = {
      height: height,
      width: width,
    };

    const pageList = _.map(orderedPages, (pageId, i) => {
      const style = {display: i === currentPage ? 'block' : 'none' };
      const page = pages[pageId];
      return (
        <div className="rework--workpad-page" key={page.id} style={style}>
          <Page page={page} elements={elements}></Page>
        </div>
      );
    });

    return (
      <div className="rework--workpad" style={style}>
        {pageList}
      </div>
    );
  }
});
