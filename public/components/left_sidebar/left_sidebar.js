import React from 'react';

export default React.createClass({
  render() {
    const style = {
      display: 'flex',
      position: 'relative'
    };

    return (
      <div className="rework--left-sidebar" style={style}>
        {this.props.children}
      </div>
    );
  }
});
