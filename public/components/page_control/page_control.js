import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';
import Centered from 'plugins/rework/components/centered/centered.js';


import './page_control.less';

const PageControl = React.createClass({
  render() {
    const { direction, handler } = this.props;

    if (direction !== 'next' && direction !== 'previous') {
      throw 'directions must be "next" or "previous"';
    }

    const iconClass = classnames({
      'fa-chevron-circle-left': direction === 'previous',
      'fa-chevron-circle-right': direction === 'next',
      'fa': true
    });

    return (
        <a className="rework--page-control" onClick={handler}>
            <i className={iconClass}></i>
        </a>
    );
  }
});

function mapStateToProps(state) {
  return {
    page: state.transient.editor
  };
}

export default connect(mapStateToProps)(PageControl);
