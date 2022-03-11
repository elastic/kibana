/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, Fragment, ComponentType } from 'react';

import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { IndexPatternSelectFormRow } from './index_pattern_select_form_row';
import { FieldSelect } from './field_select';
import { ControlParams, ControlParamsOptions } from '../../editor_utils';
import { IndexPatternSelectProps } from '../../../../data/public';
import { DataView, DataViewField } from '../../../../data_views/public';
import { InputControlVisDependencies } from '../../plugin';

interface RangeControlEditorProps {
  controlIndex: number;
  controlParams: ControlParams;
  getIndexPattern: (indexPatternId: string) => Promise<DataView>;
  handleFieldNameChange: (fieldName: string) => void;
  handleIndexPatternChange: (indexPatternId: string) => void;
  handleOptionsChange: <T extends keyof ControlParamsOptions>(
    controlIndex: number,
    optionName: T,
    value: ControlParamsOptions[T]
  ) => void;
  deps: InputControlVisDependencies;
}

interface RangeControlEditorState {
  IndexPatternSelect: ComponentType<IndexPatternSelectProps> | null;
}

function filterField(field: DataViewField) {
  return field.type === 'number';
}

export class RangeControlEditor extends Component<
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
            onChange={(event) => {
              this.props.handleOptionsChange(
                this.props.controlIndex,
                'step',
                event.target.valueAsNumber
              );
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
            onChange={(event) => {
              this.props.handleOptionsChange(
                this.props.controlIndex,
                'decimalPlaces',
                event.target.valueAsNumber
              );
            }}
            data-test-subj={`rangeControlDecimalPlacesInput${this.props.controlIndex}`}
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
