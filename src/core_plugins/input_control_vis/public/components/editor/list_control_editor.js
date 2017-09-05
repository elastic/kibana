import PropTypes from 'prop-types';
import React from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

function filterField(field) {
  return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
}

export function ListControlEditor(props) {
  return (
    <div>

      <IndexPatternSelect
        value={props.controlParams.indexPattern}
        onChange={props.handleIndexPatternChange}
        getIndexPatterns={props.getIndexPatterns}
      />

      <FieldSelect
        value={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
      />

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label">
          Enable Multiselect
        </label>
        <div className="kuiSideBarFormRow__control">
          <input
            className="kuiCheckBox"
            type="checkbox"
            checked={props.controlParams.options.multiselect}
            onChange={props.handleMultiselectChange}
          />
        </div>
      </div>

      <div className="kuiSideBarFormRow">
        <label className="kuiSideBarFormRow__label">
          Size
        </label>
        <div className="kuiSideBarFormRow__control kuiFieldGroupSection--wide">
          <input
            className="kuiTextInput"
            type="number"
            min="1"
            value={props.controlParams.options.size}
            onChange={props.handleSizeChange}
          />
        </div>
      </div>

    </div>
  );
}

ListControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleMultiselectChange: PropTypes.func.isRequired,
  handleSizeChange: PropTypes.func.isRequired
};
