import React from 'react';

export default React.createClass({
  render() {
    const {id, style} = this.props.page;
    const pageStyle = {
      ...style,
      height: '100%',
      width: '100%',
      position: 'relative',
    };

    return (
      <div className="rework--page" id={id} style={pageStyle}>
        {this.props.children}
      </div>
    );
  }
});
