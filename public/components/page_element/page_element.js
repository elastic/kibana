import React from 'react';
import _ from 'lodash';
import './page_element.less';

export default React.createClass({
  render() {
    const {id, layout, style} = this.props;
    const inlineStyle = Object.assign({}, layout, style, {position: 'absolute'});
    return (
      <div className="rework--page-element" style={inlineStyle}>
        {this.props.children}
      </div>
    );
  }
});
