import React from 'react';

export default React.createClass({
  render() {
    const { children, position } = this.props;

    const newChildren = React.Children.map(children, (child) => {
      const newStyle = {
        position: 'absolute',
        transform: `rotate(${position.angle}deg)`,
        height: position.height,
        width: position.width,
        top: position.top,
        left: position.width
      };
      return (<div style={newStyle}>{child}</div>);
    });

    return (
      <div>{newChildren}</div>
    );
  }
});
