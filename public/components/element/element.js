import React from 'react';

export default React.createClass({
  render() {
    const {type, props} = this.props.element;
    return (
      <div className="rework--element">
        <h3>{type}</h3>
      </div>
    );
  }
});
