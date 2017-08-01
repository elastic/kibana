import _ from 'lodash';
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

    this.props.scope.vis.params = props.scope.vis.params;
    this.getIndexPatterns = async () => {
      return await props.scope.vis.API.indexPatterns.getIndexPatterns();
    };
    this.getIndexPattern = (indexPatternId) => {
      return props.scope.vis.API.indexPatterns.get(indexPatternId);
    };
    this.handleFieldNameChange = this.handleFieldNameChange.bind(this);
    this.handleLabelChange = this.handleLabelChange.bind(this);
    this.handleIndexPatternChange = this.handleIndexPatternChange.bind(this);
    this.handleRemoveField = this.handleRemoveField.bind(this);
    this.handleAddField = this.handleAddField.bind(this);
  }

  setVisParam(paramName, paramValue) {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleLabelChange(fieldIndex, evt) {
    const updatedField = this.props.scope.vis.params.fields[fieldIndex];
    updatedField.label = evt.target.value;
    this.setVisParam('fields', setField(this.props.scope.vis.params.fields, fieldIndex, updatedField));
  }

  handleIndexPatternChange(fieldIndex, evt) {
    const updatedField = this.props.scope.vis.params.fields[fieldIndex];
    updatedField.indexPattern = evt.value;
    updatedField.fieldName = '';
    this.setVisParam('fields', setField(this.props.scope.vis.params.fields, fieldIndex, updatedField));
  }

  handleFieldNameChange(fieldIndex, evt) {
    const updatedField = this.props.scope.vis.params.fields[fieldIndex];
    updatedField.fieldName = evt.value;
    this.setVisParam('fields', setField(this.props.scope.vis.params.fields, fieldIndex, updatedField));
  }

  handleRemoveField(fieldIndex) {
    this.setVisParam('fields', removeField(this.props.scope.vis.params.fields, fieldIndex));
  }

  handleAddField() {
    this.setVisParam('fields', addField(this.props.scope.vis.params.fields, newField()));
  }

  renderFields() {
    return this.props.scope.vis.params.fields.map((field, index) => {
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
                onChange={this.handleLabelChange.bind(null, index)}
              />
            </div>
            <button
              className="kuiButton kuiButton--danger kuiButton--small"
              onClick={this.handleRemoveField.bind(null, index)}
            >
              <span className="kuiIcon fa-trash" />
            </button>
          </div>

          <IndexPatternSelect
            value={field.indexPattern}
            onChange={this.handleIndexPatternChange.bind(null, index)}
            getIndexPatterns={this.getIndexPatterns}
          />

          <FieldSelect
            value={field.fieldName}
            indexPatternId={field.indexPattern}
            onChange={this.handleFieldNameChange.bind(null, index)}
            getIndexPattern={this.getIndexPattern}
          />
        </div>
      );
    });
  }

  render() {
    return (
      <div>

        {this.renderFields()}

        <KuiButton
          buttonType="primary"
          type="button"
          icon={<KuiButtonIcon type="create" />}
          onClick={this.handleAddField}
        >
          Add
        </KuiButton>
      </div>
    );
  }
}
