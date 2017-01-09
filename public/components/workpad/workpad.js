import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import Page from 'plugins/rework/components/page/page';

import './workpad.less';

const Workpad = React.createClass({
  render() {
    const {height, width, page, pages} = this.props;

    const style = {
      height: this.props.height,
      width: this.props.width,
      backgroundColor: '#fff'
    };

    const pageList = _.map(pages, (page) => (
      <Page key={page.id} page={page}></Page>
    ));

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
    page: page,
    pages: pages
  };
}

export default connect(mapStateToProps)(Workpad);
