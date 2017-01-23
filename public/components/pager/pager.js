import React from 'react';
import { connect } from 'react-redux';
import classnames from 'classnames';

import './pager.less';

export default React.createClass({
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
