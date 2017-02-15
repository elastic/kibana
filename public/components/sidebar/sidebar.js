import React from 'react';

export default class Sidebar extends React.PureComponent {
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
};
