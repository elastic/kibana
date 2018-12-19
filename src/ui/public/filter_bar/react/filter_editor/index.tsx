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

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { noop } from 'lodash';
import React, { Component } from 'react';
import { MetaFilter } from '../../filters';

const fieldOptions = [
  {
    label: 'Fields',
    isGroupLabelOption: true,
  },
  {
    label: 'field_1',
  },
  {
    label: 'field_2',
  },
  {
    label: 'field_3',
  },
  {
    label: 'field_4',
  },
];
const operatorOptions = [
  {
    label: 'Operators',
    isGroupLabelOption: true,
  },
  {
    label: 'IS',
  },
  {
    label: 'IS NOT',
  },
  {
    label: 'IS ONE OF',
  },
  {
    label: 'EXISTS',
  },
];
const valueOptions = [
  {
    label: 'Values',
    isGroupLabelOption: true,
  },
  {
    label: 'Value 1',
  },
  {
    label: 'Value 2',
  },
  {
    label: 'Value 3',
  },
  {
    label: 'Value 4',
  },
];

interface Props {
  filter: MetaFilter;
}

interface State {
  selectedField: EuiComboBoxOptionProps[];
  selectedOperand: EuiComboBoxOptionProps[];
  selectedValues: EuiComboBoxOptionProps[];
  valueOptions: EuiComboBoxOptionProps[];
  operatorOptions: EuiComboBoxOptionProps[];
  fieldOptions: EuiComboBoxOptionProps[];
  useCustomLabel: boolean;
  customLabel: string | null;
}

export class FilterEditor extends Component<Props, State> {
  public state = {
    fieldOptions,
    operatorOptions,
    valueOptions,
    selectedField: [],
    selectedOperand: [],
    selectedValues: [],
    useCustomLabel: false,
    customLabel: null,
  };

  public onFieldChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    // We should only get back either 0 or 1 options.
    this.setState({
      selectedField: selectedOptions,
    });
  };

  public onOperandChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    // We should only get back either 0 or 1 options.
    this.setState({
      selectedOperand: selectedOptions,
    });
  };

  public onValuesChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    this.setState({
      selectedValues: selectedOptions,
    });
  };

  public onCustomLabelSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      useCustomLabel: event.target.checked,
    });
  };

  public onFieldSearchChange = (searchValue: string) => {
    this.setState({
      fieldOptions: fieldOptions.filter(option =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    });
  };

  public onOperandSearchChange = (searchValue: string) => {
    this.setState({
      operatorOptions: operatorOptions.filter(option =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    });
  };

  public onValuesSearchChange = (searchValue: string) => {
    this.setState({
      valueOptions: valueOptions.filter(option =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      ),
    });
  };

  public resetForm = () => {
    this.setState({
      selectedField: [],
      selectedOperand: [],
      selectedValues: [],
      useCustomLabel: false,
      customLabel: null,
    });
  };

  public render() {
    return (
      <div>
        <EuiFlexGroup>
          <EuiFlexItem style={{ maxWidth: '188px' }}>
            <EuiFormRow label="Field">
              <EuiComboBox
                placeholder={
                  this.state.selectedOperand.length < 1 ? 'Start here' : 'Select a field'
                }
                options={this.state.fieldOptions}
                selectedOptions={this.state.selectedField}
                onChange={this.onFieldChange}
                onSearchChange={this.onFieldSearchChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem style={{ maxWidth: '188px' }}>
            <EuiFormRow label="Operand">
              <EuiComboBox
                placeholder={
                  this.state.selectedField.length < 1 ? 'Select a field first' : 'Select an operand'
                }
                isDisabled={this.state.selectedField.length < 1}
                options={this.state.operatorOptions}
                selectedOptions={this.state.selectedOperand}
                onChange={this.onOperandChange}
                onSearchChange={this.onOperandSearchChange}
                singleSelection={{ asPlainText: true }}
                isClearable={false}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <div>
          <EuiFormRow label="Value(s)">
            <EuiComboBox
              placeholder={
                this.state.selectedField.length < 1 && this.state.selectedOperand.length < 1
                  ? 'Waiting on previous selections'
                  : 'Select one or more values'
              }
              isDisabled={
                this.state.selectedField.length < 1 || this.state.selectedOperand.length < 1
              }
              options={this.state.valueOptions}
              selectedOptions={this.state.selectedValues}
              onChange={this.onValuesChange}
              onSearchChange={this.onValuesSearchChange}
            />
          </EuiFormRow>
        </div>

        <EuiSpacer size="m" />

        <EuiSwitch
          label="Create custom label?"
          checked={this.state.useCustomLabel}
          onChange={this.onCustomLabelSwitchChange}
        />

        {this.state.useCustomLabel && (
          <div>
            <EuiSpacer size="m" />
            <EuiFormRow label="Custom label">
              <EuiFieldText value={`${this.state.customLabel}`} onChange={noop} />
            </EuiFormRow>
          </div>
        )}

        <EuiSpacer size="m" />

        <EuiFlexGroup direction="rowReverse" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton isDisabled={this.state.selectedValues.length < 1} fill onClick={noop}>
              Add
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="right" onClick={this.props.filter ? noop : this.resetForm}>
              {this.props.filter ? 'Cancel' : 'Reset form'}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            {this.props.filter && (
              <EuiButtonEmpty flush="left" color="danger">
                Delete
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
