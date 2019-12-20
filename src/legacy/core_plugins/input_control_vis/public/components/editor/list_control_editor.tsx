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

import React, { PureComponent, ComponentType } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldNumber, EuiSwitch, EuiSelect, EuiSelectProps } from '@elastic/eui';

import { IndexPatternSelectFormRow } from './index_pattern_select_form_row';
import { FieldSelect } from './field_select';
import { ControlParams, ControlParamsOptions } from '../../editor_utils';
import {
  IIndexPattern,
  IFieldType,
  IndexPatternSelect,
} from '../../../../../../plugins/data/public';
import { InputControlVisDependencies } from '../../plugin';

interface ListControlEditorState {
  isLoadingFieldType: boolean;
  isStringField: boolean;
  prevFieldName: string;
  IndexPatternSelect: ComponentType<IndexPatternSelect['props']> | null;
}

interface ListControlEditorProps {
  getIndexPattern: (indexPatternId: string) => Promise<IIndexPattern>;
  controlIndex: number;
  controlParams: ControlParams;
  handleFieldNameChange: (fieldName: string) => void;
  handleIndexPatternChange: (indexPatternId: string) => void;
  handleOptionsChange: <T extends keyof ControlParamsOptions>(
    controlIndex: number,
    optionName: T,
    value: ControlParamsOptions[T]
  ) => void;
  handleParentChange: (controlIndex: number, parent: string) => void;
  parentCandidates: EuiSelectProps['options'];
  deps: InputControlVisDependencies;
}

function filterField(field: IFieldType) {
  return (
    Boolean(field.aggregatable) &&
    ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type)
  );
}

export class ListControlEditor extends PureComponent<
  ListControlEditorProps,
  ListControlEditorState
> {
  private isMounted: boolean = false;

  state: ListControlEditorState = {
    isLoadingFieldType: true,
    isStringField: false,
    prevFieldName: this.props.controlParams.fieldName,
    IndexPatternSelect: null,
  };

  componentDidMount() {
    this.isMounted = true;
    this.loadIsStringField();
    this.getIndexPatternSelect();
  }

  componentWillUnmount() {
    this.isMounted = false;
  }

  static getDerivedStateFromProps = (
    nextProps: ListControlEditorProps,
    prevState: ListControlEditorState
  ) => {
    const isNewFieldName = prevState.prevFieldName !== nextProps.controlParams.fieldName;
    if (!prevState.isLoadingFieldType && isNewFieldName) {
      return {
        prevFieldName: nextProps.controlParams.fieldName,
        isLoadingFieldType: true,
      };
    }

    return null;
  };

  componentDidUpdate = () => {
    if (this.state.isLoadingFieldType) {
      this.loadIsStringField();
    }
  };

  async getIndexPatternSelect() {
    const [, { data }] = await this.props.deps.core.getStartServices();
    this.setState({
      IndexPatternSelect: data.ui.IndexPatternSelect,
    });
  }

  loadIsStringField = async () => {
    if (!this.props.controlParams.indexPattern || !this.props.controlParams.fieldName) {
      this.setState({ isLoadingFieldType: false });
      return;
    }

    let indexPattern: IIndexPattern;
    try {
      indexPattern = await this.props.getIndexPattern(this.props.controlParams.indexPattern);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this.isMounted) {
      return;
    }

    const field = (indexPattern.fields as IFieldType[]).find(
      ({ name }) => name === this.props.controlParams.fieldName
    );
    if (!field) {
      return;
    }
    this.setState({
      isLoadingFieldType: false,
      isStringField: field.type === 'string',
    });
  };

  renderOptions = () => {
    if (this.state.isLoadingFieldType || !this.props.controlParams.fieldName) {
      return;
    }

    const options = [];
    if (this.props.parentCandidates && this.props.parentCandidates.length > 0) {
      const parentCandidatesOptions = [{ value: '', text: '' }, ...this.props.parentCandidates];
      options.push(
        <EuiFormRow
          id={`parentSelect-${this.props.controlIndex}`}
          label={
            <FormattedMessage
              id="inputControl.editor.listControl.parentLabel"
              defaultMessage="Parent control"
            />
          }
          helpText={
            <FormattedMessage
              id="inputControl.editor.listControl.parentDescription"
              defaultMessage="Options are based on the value of parent control. Disabled if parent is not set."
            />
          }
          key="parentSelect"
        >
          <EuiSelect
            options={parentCandidatesOptions}
            value={this.props.controlParams.parent}
            onChange={event => {
              this.props.handleParentChange(this.props.controlIndex, event.target.value);
            }}
          />
        </EuiFormRow>
      );
    }

    options.push(
      <EuiFormRow
        id={`multiselect-${this.props.controlIndex}`}
        key="multiselect"
        helpText={
          <FormattedMessage
            id="inputControl.editor.listControl.multiselectDescription"
            defaultMessage="Allow multiple selection"
          />
        }
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="inputControl.editor.listControl.multiselectLabel"
              defaultMessage="Multiselect"
            />
          }
          checked={this.props.controlParams.options.multiselect ?? true}
          onChange={event => {
            this.props.handleOptionsChange(
              this.props.controlIndex,
              'multiselect',
              event.target.checked
            );
          }}
          data-test-subj="listControlMultiselectInput"
        />
      </EuiFormRow>
    );

    const dynamicOptionsHelpText = this.state.isStringField ? (
      <FormattedMessage
        id="inputControl.editor.listControl.dynamicOptions.updateDescription"
        defaultMessage="Update options in response to user input"
      />
    ) : (
      <FormattedMessage
        id="inputControl.editor.listControl.dynamicOptions.stringFieldDescription"
        defaultMessage='Only available for "string" fields'
      />
    );
    options.push(
      <EuiFormRow
        id={`dynamicOptions-${this.props.controlIndex}`}
        key="dynamicOptions"
        helpText={dynamicOptionsHelpText}
      >
        <EuiSwitch
          label={
            <FormattedMessage
              id="inputControl.editor.listControl.dynamicOptionsLabel"
              defaultMessage="Dynamic Options"
            />
          }
          checked={this.props.controlParams.options.dynamicOptions ?? false}
          onChange={event => {
            this.props.handleOptionsChange(
              this.props.controlIndex,
              'dynamicOptions',
              event.target.checked
            );
          }}
          disabled={this.state.isStringField ? false : true}
          data-test-subj="listControlDynamicOptionsSwitch"
        />
      </EuiFormRow>
    );

    // size is not used when dynamic options is set
    if (!this.props.controlParams.options.dynamicOptions || !this.state.isStringField) {
      options.push(
        <EuiFormRow
          id={`size-${this.props.controlIndex}`}
          label={
            <FormattedMessage
              id="inputControl.editor.listControl.sizeLabel"
              defaultMessage="Size"
            />
          }
          key="size"
          helpText={
            <FormattedMessage
              id="inputControl.editor.listControl.sizeDescription"
              defaultMessage="Number of options"
            />
          }
        >
          <EuiFieldNumber
            min={1}
            value={this.props.controlParams.options.size}
            onChange={event => {
              this.props.handleOptionsChange(
                this.props.controlIndex,
                'size',
                event.target.valueAsNumber
              );
            }}
            data-test-subj="listControlSizeInput"
          />
        </EuiFormRow>
      );
    }

    return options;
  };

  render() {
    if (this.state.IndexPatternSelect === null) {
      return null;
    }

    return (
      <>
        <IndexPatternSelectFormRow
          indexPatternId={this.props.controlParams.indexPattern}
          onChange={this.props.handleIndexPatternChange}
          controlIndex={this.props.controlIndex}
          IndexPatternSelect={this.state.IndexPatternSelect}
        />

        <FieldSelect
          fieldName={this.props.controlParams.fieldName}
          indexPatternId={this.props.controlParams.indexPattern}
          filterField={filterField}
          onChange={this.props.handleFieldNameChange}
          getIndexPattern={this.props.getIndexPattern}
          controlIndex={this.props.controlIndex}
        />

        {this.renderOptions()}
      </>
    );
  }
}
