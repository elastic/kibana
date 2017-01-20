import React from 'react';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';

export default React.createClass({
  select(elementType) {
    const {onSelect} = this.props;
    return () => onSelect(elementType);
  },
  render() {
    const {onSelect} = this.props;

    const elementButtons = _.map(elementTypes, (elementType) => (
        <button
          className="btn btn-default"
          key={elementType.name}
          onClick={this.select(elementType)}>{elementType.name}
        </button>
      )
    );

    return (
      <div className="rework--element-type-list">
        {elementButtons}
      </div>
    );
  }
});
