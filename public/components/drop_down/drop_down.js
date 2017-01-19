import React from 'react';

export default React.createClass({
  render() {
    const style = {
      display: 'flex',
      position: 'relative',
      padding: '10px'
    };

    return (
      <div className="rework--dropdown" style={style}>
        {this.props.children}
      </div>
    );
  }
});
