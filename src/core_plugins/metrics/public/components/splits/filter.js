import createTextHandler from '../lib/create_text_handler';
import createSelectHandler from '../lib/create_select_handler';
import GroupBySelect from './group_by_select';
import React, { Component, PropTypes } from 'react';

class SplitByFilter extends Component {

  render() {
    const { onChange, model, refs } = this.props;
    const handleTextChange = createTextHandler(onChange, refs);
    const handleSelectChange = createSelectHandler(onChange);
    return (
      <div className="vis_editor__split-container">
        <div className="vis_editor__label">Group By</div>
        <div className="vis_editor__split-selects">
          <GroupBySelect
            value={model.split_mode}
            onChange={handleSelectChange('split_mode')} />
        </div>
        <div className="vis_editor__label">Query String</div>
        <input
          className="vis_editor__split-filter"
          defaultValue={model.filter}
          onChange={handleTextChange('filter')}
          ref="filter"/>
      </div>
    );
  }

}

SplitByFilter.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default SplitByFilter;
