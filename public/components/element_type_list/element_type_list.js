import React from 'react';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import './element_type_list.less';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';
import IconSelect from 'plugins/rework/components/icon_select/icon_select';

export default class ElementTypeList extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  render() {

    const options = _.chain(elementTypes)
      .map(elementType => {
        return {
          label: elementType.displayName,
          icon: elementType.icon,
          value: elementType
        };
      })
      .sortBy('label')
      .value();

    return (
      <div className="rework--element-type-list">
        <IconSelect onSelect={this.props.onSelect.bind(this)} options={options}/>
      </div>
    );
  }
};
