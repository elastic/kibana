import React from 'react';

export default React.createClass({
  render() {
    const {id, type, props} = this.props.page;
    const style = props._style;
    return (
      <div className="rework--page" style={style}>
        {id}
      </div>
    );
  }
});
