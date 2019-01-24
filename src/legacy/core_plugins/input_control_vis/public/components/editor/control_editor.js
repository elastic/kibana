/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { RangeControlEditor } from './range_control_editor';
import { ListControlEditor } from './list_control_editor';
import { getTitle } from '../../editor_utils';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

class ControlEditorUi extends Component {

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
            getIndexPattern={this.props.getIndexPattern}
            handleNumberOptionChange={this.props.handleNumberOptionChange}
            handleCheckboxOptionChange={this.props.handleCheckboxOptionChange}
            parentCandidates={this.props.parentCandidates}
            handleParentChange={this.props.handleParentChange}
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
          label={<FormattedMessage id="inputControl.editor.controlEditor.controlLabel" defaultMessage="Control Label"/>}
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

  renderEditorButtons() {
    return (
      <div>
        <EuiButtonIcon
          aria-label={this.props.intl.formatMessage({
            id: 'inputControl.editor.controlEditor.moveControlUpAriaLabel',
            defaultMessage: 'Move control up'
          })}
          color="primary"
          onClick={this.moveUpControl}
          iconType="sortUp"
          data-test-subj={`inputControlEditorMoveUpControl${this.props.controlIndex}`}
        />
        <EuiButtonIcon
          aria-label={this.props.intl.formatMessage({
            id: 'inputControl.editor.controlEditor.moveControlDownAriaLabel',
            defaultMessage: 'Move control down'
          })}
          color="primary"
          onClick={this.moveDownControl}
          iconType="sortDown"
          data-test-subj={`inputControlEditorMoveDownControl${this.props.controlIndex}`}
        />
        <EuiButtonIcon
          aria-label={this.props.intl.formatMessage({
            id: 'inputControl.editor.controlEditor.removeControlAriaLabel',
            defaultMessage: 'Remove control'
          })}
          color="danger"
          onClick={this.removeControl}
          iconType="cross"
          data-test-subj={`inputControlEditorRemoveControl${this.props.controlIndex}`}
        />
      </div>
    );
  }

  render() {
    return (
      <EuiPanel grow={false} className="icvControlEditor__panel">

        <EuiAccordion
          id="controlEditorAccordion"
          buttonContent={getTitle(this.props.controlParams, this.props.controlIndex)}
          extraAction={this.renderEditorButtons()}
          initialIsOpen={true}
        >
          <EuiSpacer size="s" />
          {this.renderEditor()}
        </EuiAccordion>

      </EuiPanel>
    );
  }
}

ControlEditorUi.propTypes = {
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleLabelChange: PropTypes.func.isRequired,
  moveControl: PropTypes.func.isRequired,
  handleRemoveControl: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  getIndexPattern: PropTypes.func.isRequired,
  handleCheckboxOptionChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired,
  parentCandidates: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
  })).isRequired,
  handleParentChange: PropTypes.func.isRequired,
};

export const ControlEditor = injectI18n(ControlEditorUi);
