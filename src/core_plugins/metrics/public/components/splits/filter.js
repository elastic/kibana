import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import GroupBySelect from './group_by_select';
import PropTypes from 'prop-types';
import React from 'react';

export const SplitByFilter = props => {
  const { onChange } = props;
  const defaults = { filter: '' };
  const model = { ...defaults, ...props.model };
  const handleTextChange = createTextHandler(onChange);
  const handleSelectChange = createSelectHandler(onChange);
  return (
    <div className="vis_editor__split-container">
      <div className="vis_editor__label">Group By</div>
      <div className="vis_editor__split-selects">
        <GroupBySelect
          value={model.split_mode}
          onChange={handleSelectChange('split_mode')}
        />
      </div>
      <div className="vis_editor__label">Query String</div>
      <input
        className="vis_editor__split-filter"
        value={model.filter}
        onChange={handleTextChange('filter')}
      />
    </div>
  );
};

SplitByFilter.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};
