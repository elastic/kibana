import React from 'react';
import _ from 'lodash';

export default React.createClass({
  render() {
    const {type, properties} = this.props;
    return (
      <div className="rework--element">
        <h3>{type}</h3>
      </div>
    );
  }
});
