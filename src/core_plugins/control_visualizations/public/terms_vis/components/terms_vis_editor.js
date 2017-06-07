import React, { Component } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';
import {
  KuiButton,
  KuiButtonIcon,
} from 'ui_framework/components';
import { addField, newField, removeField, setField } from '../lib/editor_utils';

export class TermsVisEditor extends Component {
  constructor(props) {
    super(props);

    this.handleFieldNameChange = this.handleFieldNameChange.bind(this);
    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.handleIndexPatternChange = this.handleIndexPatternChange.bind(this);
    this.handleRemoveField = this.handleRemoveField.bind(this);
    this.handleAddField = this.handleAddField.bind(this);
  }

  shouldComponentUpdate() {
    console.log('shouldComponentUpdate');
  }

  componentWillReceiveProps(newProps) {
    console.log('newProps', newProps);
  }

  handleLabelChange(fieldIndex, evt) {
    const updatedField = this.props.visParams.fields[fieldIndex];
    updatedField.label = evt.target.value;
    this.props.setVisParam('fields', setField(this.props.visParams.fields, fieldIndex, updatedField));
  }

  handleIndexPatternChange(fieldIndex, evt) {
    const updatedField = this.props.visParams.fields[fieldIndex];
    updatedField.indexPattern = evt.value;
    updatedField.fieldName = '';
    this.props.setVisParam('fields', setField(this.props.visParams.fields, fieldIndex, updatedField));
  }

  handleFieldNameChange(fieldIndex, evt) {
    const updatedField = this.props.visParams.fields[fieldIndex];
    updatedField.fieldName = evt.value;
    this.props.setVisParam('fields', setField(this.props.visParams.fields, fieldIndex, updatedField));
  }

  handleRemoveField(fieldIndex) {
    this.props.setVisParam('fields', removeField(this.props.visParams.fields, fieldIndex));
  }

  handleAddField() {
    this.props.setVisParam('fields', addField(this.props.visParams.fields, newField()));
  }

  renderFields() {
    return this.props.visParams.fields.map((field, index) => {
      return (
        <div key={index} className="field-section">
          <div className="kuiFieldGroup">
            <div className="kuiFieldGroupSection">
              <label>
                Label
              </label>
            </div>
            <div className="kuiFieldGroupSection">
              <input
                className="kuiTextInput"
                type="text"
                value={field.label}
                onChange={this.handleLabelChange.bind(null, index)} />
            </div>
            <button
              className="kuiButton kuiButton--danger kuiButton--small"
              onClick={this.handleRemoveField.bind(null, index)}>
              <span className="kuiIcon fa-trash"></span>
            </button>
          </div>

          <IndexPatternSelect
            value={field.indexPattern}
            onChange={this.handleIndexPatternChange.bind(null, index)}
            getIndexPatternIds={this.props.getIndexPatternIds} />

          <FieldSelect
            value={field.fieldName}
            indexPatternId={field.indexPattern}
            onChange={this.handleFieldNameChange.bind(null, index)}
            getIndexPattern={this.props.getIndexPattern} />
        </div>
      );
    });
  }

  render() {
    return (
      <div>
<div>
  {this.props.count}
</div>
        {this.renderFields()}

        <KuiButton
          type="primary"
          icon={<KuiButtonIcon type="create" />}
          onClick={this.handleAddField}
        >
          Add
        </KuiButton>
      </div>
    );
  }
}
