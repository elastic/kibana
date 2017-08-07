import _ from 'lodash';
import React, { Component } from 'react';
import { RangeControlEditor } from './range_control_editor';
import { TermsControlEditor } from './terms_control_editor';
import { TextControlEditor } from './text_control_editor';
import {
  KuiButton,
  KuiButtonIcon,
} from 'ui_framework/components';
import { addControl, getDefaultOptions, newControl, removeControl, setControl } from '../lib/editor_utils';

export class InputControlVisEditor extends Component {
  constructor(props) {
    super(props);

    this.props.scope.vis.params = props.scope.vis.params;
    this.getIndexPatterns = async () => {
      return await props.scope.vis.API.indexPatterns.getIndexPatterns();
    };
    this.getIndexPattern = (indexPatternId) => {
      return props.scope.vis.API.indexPatterns.get(indexPatternId);
    };
    this.handleAddControl = this.handleAddControl.bind(this);
  }

  setVisParam(paramName, paramValue) {
    const params = _.cloneDeep(this.props.scope.vis.params);
    params[paramName] = paramValue;
    this.props.stageEditorParams(params);
  }

  handleLabelChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.label = evt.target.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleTypeChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.type = evt.target.value;
    updatedControl.options = getDefaultOptions(updatedControl.type);
    updatedControl.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleIndexPatternChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.indexPattern = evt.value;
    updatedControl.fieldName = '';
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleFieldNameChange(controlIndex, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.fieldName = evt.value;
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleNumberOptionChange(controlIndex, optionName, evt) {
    const updatedControl = this.props.scope.vis.params.controls[controlIndex];
    updatedControl.options[optionName] = parseFloat(evt.target.value);
    this.setVisParam('controls', setControl(this.props.scope.vis.params.controls, controlIndex, updatedControl));
  }

  handleRemoveControl(controlIndex) {
    this.setVisParam('controls', removeControl(this.props.scope.vis.params.controls, controlIndex));
  }

  handleAddControl() {
    this.setVisParam('controls', addControl(this.props.scope.vis.params.controls, newControl('terms')));
  }

  renderControls() {
    return this.props.scope.vis.params.controls.map((controlParams, controlIndex) => {
      let controlEditor = null;
      switch (controlParams.type) {
        case 'terms':
          controlEditor = (
            <TermsControlEditor
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
              handleSizeChange={this.handleNumberOptionChange.bind(this, controlIndex, 'size')}
            />
          );
          break;
        case 'range':
          controlEditor = (
            <RangeControlEditor
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
              handleStepChange={this.handleNumberOptionChange.bind(this, controlIndex, 'step')}
            />
          );
          break;
        case 'text':
          controlEditor = (
            <TextControlEditor
              controlParams={controlParams}
              handleIndexPatternChange={this.handleIndexPatternChange.bind(this, controlIndex)}
              handleFieldNameChange={this.handleFieldNameChange.bind(this, controlIndex)}
              getIndexPatterns={this.getIndexPatterns}
              getIndexPattern={this.getIndexPattern}
            />
          );
      }
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
                value={controlParams.label}
                onChange={this.handleLabelChange.bind(this, controlIndex)}
              />
            </div>
            <button
              className="kuiButton kuiButton--danger kuiButton--small"
              onClick={this.handleRemoveControl.bind(this, controlIndex)}
            >
              <span className="kuiIcon fa-trash" />
            </button>
          </div>

          <div className="kuiFieldGroup">
            <div className="kuiFieldGroupSection">
              <label>
                Type
              </label>
            </div>
            <div className="kuiFieldGroupSection">
              <select
                className="kuiSelectInput"
                value={controlParams.type}
                onChange={this.handleTypeChange.bind(this, controlIndex)}
              >
                <option value="range">Range Slider</option>
                <option value="terms">Terms Dropdown</option>
                <option value="text">Text Input</option>
              </select>
            </div>
          </div>

          {controlEditor}
        </div>
      );
    });
  }

  render() {
    return (
      <div className="input-control-vis-editor">

        {this.renderControls()}

        <KuiButton
          buttonType="primary"
          type="button"
          icon={<KuiButtonIcon type="create" />}
          onClick={this.handleAddControl}
        >
          Add
        </KuiButton>
      </div>
    );
  }
}
