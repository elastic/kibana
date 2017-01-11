import React from 'react';

export default React.createClass({
  render() {
    const {height, width} = this.props.workpad;

    const style = {
      height: height,
      width: width,
      'box-shadow': '0px 0px 5px 0px rgba(0,0,0,0.5)'
    };

    return (
      <div className="rework--workpad" style={style}>
        {this.props.children}
      </div>
    );
  }
});
