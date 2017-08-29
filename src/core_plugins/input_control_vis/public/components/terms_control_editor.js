import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';

export class TermsControlEditor extends Component {
  constructor(props) {
    super(props);
  }

  filterField(field) {
    return field.aggregatable && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type);
  }

  render() {
    return (
      <div>

        <IndexPatternSelect
          value={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          getIndexPatterns={this.props.getIndexPatterns}
        />

        <FieldSelect
          value={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          filterField={this.filterField}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
        />

        <div className="kuiSideBarFormRow">
          <label className="kuiSideBarFormRow__label">
            Enable Multiselect
          </label>
          <div className="kuiSideBarFormRow__control">
            <input
              className="kuiCheckBox"
              type="checkbox"
              checked={this.props.controlParams.options.multiselect}
              onChange={this.props.handleMultiselectChange}
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
              value={this.props.controlParams.options.size}
              onChange={this.props.handleSizeChange}
            />
          </div>
        </div>

      </div>
    );
  }
}

TermsControlEditor.propTypes = {
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleMultiselectChange: PropTypes.func.isRequired,
  handleSizeChange: PropTypes.func.isRequired
};
