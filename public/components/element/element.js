import React from 'react';
import elements from 'plugins/rework/elements/elements';

export default React.createClass({
  render() {
    const {type, props} = this.props.element;
    const ElementContent = elements.byName[type].template;
    return (
      <div className="rework--element">
        <ElementContent args={props}></ElementContent>
      </div>
    );
  }
});
