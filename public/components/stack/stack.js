import React from 'react';

export default React.createClass({
  render() {
    const { top, children } = this.props;
    const style = {
      height: '100%',
      width: '100%'
    };

    const stack = React.Children.map(children, (child, i) => {
      const newStyle = i !== top ? {display: 'none'} : style;
      return (<div style={newStyle}>{child}</div>);
    });

    return (
      <div style={style}>{stack}</div>
    );
  }
});
