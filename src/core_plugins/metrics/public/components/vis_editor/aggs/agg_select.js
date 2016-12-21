import React from 'react';
import Select from 'react-select';
import { createOptions } from '../lib/agg_lookup';
export default React.createClass({
  render() {
    const { siblings, panelType } = this.props;
    const options = createOptions(panelType, siblings);
    return (
      <div className="vis_editor__row_item">
        <Select
          clearable={false}
          options={options}
          value={this.props.value || 'count'}
          onChange={this.props.onChange}/>
      </div>
    );
  }
});

