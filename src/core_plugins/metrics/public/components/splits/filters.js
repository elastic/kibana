import createSelectHandler from '../lib/create_select_handler';
import GroupBySelect from './group_by_select';
import FilterItems from './filter_items';
import React, { PropTypes } from 'react';
function SplitByFilters(props) {
  const { onChange, model } = props;
  const handleSelectChange = createSelectHandler(onChange);
  return(
    <div className="vis_editor__item">
      <div className="vis_editor__split-container">
        <div className="vis_editor__label">Group By</div>
        <div className="vis_editor__split-selects">
          <GroupBySelect
            value={model.split_mode}
            onChange={handleSelectChange('split_mode')} />
        </div>
      </div>
      <div className="vis_editor__split-container">
        <div className="vis_editor__row vis_editor__item">
          <FilterItems
            name="split_filters"
            model={model}
            onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

SplitByFilters.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default SplitByFilters;
