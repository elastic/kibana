import _ from 'lodash';
import React, { Component } from 'react';
import { IndexPatternSelect } from './index_pattern_select';
import { FieldSelect } from './field_select';
import {
  KuiButton,
  KuiButtonIcon,
} from 'ui_framework/components';
import { addControl, newControl, removeControl, setControl } from '../lib/editor_utils';

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

  handleLabelChange(controlIndex, evt) {
    const updatedField = this.props.scope.vis.params.controls[controlIndex];
    updatedField.label = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedField));
  }

  handleIndexPatternChange(controlIndex, evt) {
    const updatedField = this.props.scope.vis.params.controls[controlIndex];
    updatedField.indexPattern = evt.value;
    updatedField.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedField));
  }

  handleFieldNameChange(controlIndex, evt) {
    const updatedField = this.props.scope.vis.params.controls[controlIndex];
    updatedField.fieldName = evt.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedField));
  }

  handleRemoveField(controlIndex) {
    this.setVisParam('controls', removeControl(this.props.scope.vis.params.controls, controlIndex));
  }

  handleAddField() {
    this.setVisParam('controls', addControl(this.props.scope.vis.params.controls, newControl()));
  }

  renderFields() {
    return this.props.scope.vis.params.controls.map((control, controlIndex) => {
      return (
        <div key={controlIndex} className="control-section">
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
                value={control.label}
                onChange={this.handleLabelChange.bind(null, controlIndex)}
              />
            </div>
            <button
              className="kuiButton kuiButton--danger kuiButton--small"
              onClick={this.handleRemoveField.bind(null, controlIndex)}
            >
              <span className="kuiIcon fa-trash" />
            </button>
          </div>

          <IndexPatternSelect
            value={control.indexPattern}
            onChange={this.handleIndexPatternChange.bind(null, controlIndex)}
            getIndexPatterns={this.getIndexPatterns}
          />

          <FieldSelect
            value={control.fieldName}
            indexPatternId={control.indexPattern}
            onChange={this.handleFieldNameChange.bind(null, controlIndex)}
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
