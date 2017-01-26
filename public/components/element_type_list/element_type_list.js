import React from 'react';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import './element_type_list.less';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default React.createClass({
  select(elementType) {
    const {onSelect} = this.props;
    return () => onSelect(elementType);
  },
  render() {
    const {onSelect} = this.props;

    const elementButtons = _.map(elementTypes, (elementType) => (
      <Tooltip key={elementType.name} content={elementType.name}>
        <button
          className="btn btn-default"
          onClick={this.select(elementType)}><center><img src={elementType.icon} width="30"/></center>
        </button>
      </Tooltip>
    ));

    return (
      <div className="rework--element-type-list">
        {elementButtons}
      </div>
    );
  }
});
