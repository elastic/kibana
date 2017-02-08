import React from 'react';

export default React.createClass({
  render() {
    const { top, children } = this.props;
    const style = {
      height: '100%',
      width: '100%',
      position: 'absolute',
      top: 0,
      left: 0
    };

    const stack = React.Children.map(children, (child, i) => {
      const newStyle = i !== top ? {...style, opacity: 0, pointerEvents: 'none'} : style;
      // Commented out the bit below because we can't have previews without rendering somewhere
      //child = i !== top ? null : child; // Don't render children that are not visisble
      return (<div style={newStyle}>{child}</div>);
    });

    return (
      <div style={style}>{stack}</div>
    );
  }
});
