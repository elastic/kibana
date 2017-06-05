import createSelectHandler from '../lib/create_select_handler';
import GroupBySelect from './group_by_select';
import React, { PropTypes } from 'react';

function SplitByEverything(props) {
  const { onChange, model } = props;
  const handleSelectChange = createSelectHandler(onChange);
  return (
    <div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      <div className="vis_editor__split-selects">
        <GroupBySelect
          value={model.split_mode}
          onChange={handleSelectChange('split_mode')} />
      </div>
    </div>
  );

}

SplitByEverything.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default SplitByEverything;

