import React from 'react';
import classnames from 'classnames';

export default React.createClass({
  render() {
    const {toggle, status} = this.props;
    const iconClass = classnames({
      'fa-chevron-left': status,
      'fa-chevron-right': !status,
      'fa': true
    });
    return (
        <a className="rework--editor-toggle" onClick={toggle}>
          <div>
            <i className={iconClass}></i>
          </div>
        </a>
    );
  }
});
