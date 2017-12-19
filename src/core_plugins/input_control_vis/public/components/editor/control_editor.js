import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { RangeControlEditor } from './range_control_editor';
import { ListControlEditor } from './list_control_editor';
import { getTitle } from '../../editor_utils';

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiText,
} from '@elastic/eui';

export class ControlEditor extends Component {

  state = {
    isEditorCollapsed: true
  }

  handleToggleControlVisibility = () => {
    this.setState(prevState => (
      {  isEditorCollapsed: !prevState.isEditorCollapsed }
    ));
  }

  changeLabel = (evt) => {
    this.props.handleLabelChange(this.props.controlIndex, evt);
  }

  removeControl = () => {
    this.props.handleRemoveControl(this.props.controlIndex);
  }

  moveUpControl = () => {
    this.props.moveControl(this.props.controlIndex, -1);
  }

  moveDownControl = () => {
    this.props.moveControl(this.props.controlIndex, 1);
  }

  changeIndexPattern = (evt) => {
    this.props.handleIndexPatternChange(this.props.controlIndex, evt);
  }

  changeFieldName = (evt) => {
    this.props.handleFieldNameChange(this.props.controlIndex, evt);
  }

  renderEditor() {
    let controlEditor = null;
    switch (this.props.controlParams.type) {
      case 'list':
        controlEditor = (
          <ListControlEditor
            controlIndex={this.props.controlIndex}
            controlParams={this.props.controlParams}
            handleIndexPatternChange={this.changeIndexPattern}
            handleFieldNameChange={this.changeFieldName}
            getIndexPatterns={this.props.getIndexPatterns}
            getIndexPattern={this.props.getIndexPattern}
            handleNumberOptionChange={this.props.handleNumberOptionChange}
            handleCheckboxOptionChange={this.props.handleCheckboxOptionChange}
          />
        );
        break;
      case 'range':
        controlEditor = (
          <RangeControlEditor
            controlIndex={this.props.controlIndex}
            controlParams={this.props.controlParams}
            handleIndexPatternChange={this.changeIndexPattern}
            handleFieldNameChange={this.changeFieldName}
            getIndexPatterns={this.props.getIndexPatterns}
            getIndexPattern={this.props.getIndexPattern}
            handleNumberOptionChange={this.props.handleNumberOptionChange}
          />
        );
        break;
      default:
        throw new Error(`Unhandled control editor type ${this.props.controlParams.type}`);
    }

    const labelId = `controlLabel${this.props.controlIndex}`;
    return (
      <EuiForm>
        <EuiFormRow
          id={labelId}
          label="Control Label"
        >
          <EuiFieldText
            value={this.props.controlParams.label}
            onChange={this.changeLabel}
          />
        </EuiFormRow>

        {controlEditor}
      </EuiForm>
    );
  }

  render() {
    const visibilityToggleIcon = this.state.isEditorCollapsed ? 'arrowDown' : 'arrowRight';

    return (
      <EuiPanel grow={false}>
        <div>
          <EuiButtonIcon
            aria-label={this.state.isEditorCollapsed ? 'Close Editor' : 'Open Editor'}
            onClick={this.handleToggleControlVisibility}
            iconType={visibilityToggleIcon}
          />
          <EuiText style={{ display: 'inline' }}>
            <span>
              {getTitle(this.props.controlParams, this.props.controlIndex)}
            </span>
          </EuiText>
          <div style={{ float: 'right' }}>
            <EuiButtonIcon
              aria-label="Move control down"
              color="secondary"
              onClick={this.moveDownControl}
              iconType="arrowDown"
              data-test-subj={`inputControlEditorMoveDownControl${this.props.controlIndex}`}
            />
            <EuiButtonIcon
              aria-label="Move control up"
              color="secondary"
              onClick={this.moveUpControl}
              iconType="arrowUp"
              data-test-subj={`inputControlEditorMoveUpControl${this.props.controlIndex}`}
            />
            <EuiButtonIcon
              aria-label="Remove control"
              color="danger"
              onClick={this.removeControl}
              iconType="cross"
              data-test-subj={`inputControlEditorRemoveControl${this.props.controlIndex}`}
            />
          </div>
        </div>

        {this.state.isEditorCollapsed && this.renderEditor()}
      </EuiPanel>
    );
  }
}

ControlEditor.propTypes = {
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleLabelChange: PropTypes.func.isRequired,
  moveControl: PropTypes.func.isRequired,
  handleRemoveControl: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  getIndexPatterns: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  handleCheckboxOptionChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired
};
