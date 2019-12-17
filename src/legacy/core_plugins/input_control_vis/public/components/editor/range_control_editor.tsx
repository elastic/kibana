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
import React, { PureComponent, Fragment, ChangeEvent, ComponentType } from 'react';

import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { IndexPatternSelectFormRow } from './index_pattern_select_form_row';
import { FieldSelect } from './field_select';
import { ControlParams, ControlParamsOptions } from '../../editor_utils';
import {
  IIndexPattern,
  IFieldType,
  IndexPatternSelect,
} from '../../../../../../plugins/data/public';
import { InputControlVisDependencies } from '../../plugin';

interface RangeControlEditorProps {
  controlIndex: number;
  controlParams: ControlParams;
  getIndexPattern: (indexPatternId: string) => Promise<IIndexPattern>;
  handleFieldNameChange: (fieldName: string) => void;
  handleIndexPatternChange: (indexPatternId: string) => void;
  handleNumberOptionChange: (
    controlIndex: number,
    optionName: keyof ControlParamsOptions,
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  deps: InputControlVisDependencies;
}

interface RangeControlEditorState {
  IndexPatternSelect: ComponentType<IndexPatternSelect['props']> | null;
}

function filterField(field: IFieldType) {
  return field.type === 'number';
}

export class RangeControlEditor extends PureComponent<
  RangeControlEditorProps,
  RangeControlEditorState
> {
  state: RangeControlEditorState = {
    IndexPatternSelect: null,
  };

  componentDidMount() {
    this.getIndexPatternSelect();
  }

  async getIndexPatternSelect() {
    const [, { data }] = await this.props.deps.core.getStartServices();
    this.setState({
      IndexPatternSelect: data.ui.IndexPatternSelect,
    });
  }

  render() {
    const stepSizeId = `stepSize-${this.props.controlIndex}`;
    const decimalPlacesId = `decimalPlaces-${this.props.controlIndex}`;
    if (this.state.IndexPatternSelect === null) {
      return null;
    }

    return (
      <Fragment>
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

        <EuiFormRow
          id={stepSizeId}
          label={
            <FormattedMessage
              id="inputControl.editor.rangeControl.stepSizeLabel"
              defaultMessage="Step Size"
            />
          }
        >
          <EuiFieldNumber
            value={this.props.controlParams.options.step}
            onChange={event => {
              this.props.handleNumberOptionChange(this.props.controlIndex, 'step', event);
            }}
            data-test-subj={`rangeControlSizeInput${this.props.controlIndex}`}
          />
        </EuiFormRow>

        <EuiFormRow
          id={decimalPlacesId}
          label={
            <FormattedMessage
              id="inputControl.editor.rangeControl.decimalPlacesLabel"
              defaultMessage="Decimal Places"
            />
          }
        >
          <EuiFieldNumber
            min={0}
            value={this.props.controlParams.options.decimalPlaces}
            onChange={event => {
              this.props.handleNumberOptionChange(this.props.controlIndex, 'decimalPlaces', event);
            }}
            data-test-subj={`rangeControlDecimalPlacesInput${this.props.controlIndex}`}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
