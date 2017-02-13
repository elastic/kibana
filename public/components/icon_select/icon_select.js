import React from 'react';
import _ from 'lodash';
import './icon_select.less';
import Tooltip from 'plugins/rework/components/tooltip/tooltip';

export default class IconSelect extends React.PureComponent {
  constructor(props) {    /* Note props is passed into the constructor in order to be used */
    super(props);
  }

  select(elementType) {
    return () => this.props.onSelect(elementType);
  }

  render() {
    const {onSelect, options} = this.props;

    const buttons = _.map(options, (option) => (
      <Tooltip key={option.icon} content={option.label}>
        <button
          className="btn btn-default"
          onClick={this.select(option.value).bind(this)}><center><img src={option.icon} width="30"/></center>
        </button>
      </Tooltip>
    ));

    return (
      <div className="rework--icon-select">
        {buttons}
      </div>
    );
  }
};
