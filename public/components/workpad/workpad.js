import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import Page from 'plugins/rework/components/page/page';
import './workpad.less';

const Workpad = React.createClass({
  render() {
    const {height, width, currentPage, pages} = this.props;

    const style = {
      height: this.props.height,
      width: this.props.width,
      backgroundColor: '#fff'
    };

    const pageList = _.map(pages, (page, i) => {
      const style = {display: i === currentPage ? 'block' : 'none' };
      return (
        <div className="rework--workpad-page" key={page.id} style={style}>
          <Page page={page}></Page>
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

function mapStateToProps(state) {
  const {height, width, page, pages} = state.persistent.workpad;
  return {
    height: height,
    width: width,
    currentPage: page,
    pages: pages
  };
}

export default connect(mapStateToProps)(Workpad);
