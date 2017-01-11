import React from 'react';
import elements from 'plugins/rework/elements/elements';

export default React.createClass({
  render() {
    const {type, args} = this.props;
    const ElementContent = elements.byName[type].template;
    return (
      <div className="rework--element">
        <ElementContent args={args}></ElementContent>
      </div>
    );
  }
});
