import React, { PropTypes } from 'react';
import Select from 'react-select';
import { createOptions } from '../../../common/agg_lookup';

function AggSelect(props) {
  const { siblings, panelType } = props;
  const options = createOptions(panelType, siblings);
  return (
    <div className="vis_editor__row_item">
      <Select
        clearable={false}
        options={options}
        value={props.value || 'count'}
        onChange={props.onChange}/>
    </div>
  );
}

AggSelect.propTypes = {
  onChange: PropTypes.func,
  panelType: PropTypes.string,
  siblings: PropTypes.array,
  value: PropTypes.string
};

export default AggSelect;
