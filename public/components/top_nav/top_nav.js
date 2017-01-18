import React from 'react';
import './top_nav.less';

export default React.createClass({
  render() {
    return (
      <div className="rework--top-nav">
        {this.props.children}
      </div>
    );
  }
});
