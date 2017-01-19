import React from 'react';

export default React.createClass({
  render() {
    const {position} = this.props;
    const style = {
      display: 'flex',
      position: 'relative'
    };

    const sidebarClass = `rework--sidebar-${position}`;

    return (
      <div className={sidebarClass} style={style}>
        {this.props.children}
      </div>
    );
  }
});
