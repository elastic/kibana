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
import React, { Fragment, ChangeEvent } from 'react';

import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { IndexPatternSelectFormRow } from './index_pattern_select_form_row';
import { FieldSelect } from './field_select';
import { ControlParams, ControlParamsOptions } from '../../editor_utils';
import { IIndexPattern, IFieldType } from '../../../../../../plugins/data/public';

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
}

function filterField(field: IFieldType) {
  return field.type === 'number';
}

export function RangeControlEditor(props: RangeControlEditorProps) {
  const stepSizeId = `stepSize-${props.controlIndex}`;
  const decimalPlacesId = `decimalPlaces-${props.controlIndex}`;
  return (
    <Fragment>
      <IndexPatternSelectFormRow
        indexPatternId={props.controlParams.indexPattern}
        onChange={props.handleIndexPatternChange}
        controlIndex={props.controlIndex}
      />

      <FieldSelect
        fieldName={props.controlParams.fieldName}
        indexPatternId={props.controlParams.indexPattern}
        filterField={filterField}
        onChange={props.handleFieldNameChange}
        getIndexPattern={props.getIndexPattern}
        controlIndex={props.controlIndex}
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
          value={props.controlParams.options.step}
          onChange={event => {
            props.handleNumberOptionChange(props.controlIndex, 'step', event);
          }}
          data-test-subj={`rangeControlSizeInput${props.controlIndex}`}
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
          value={props.controlParams.options.decimalPlaces}
          onChange={event => {
            props.handleNumberOptionChange(props.controlIndex, 'decimalPlaces', event);
          }}
          data-test-subj={`rangeControlDecimalPlacesInput${props.controlIndex}`}
        />
      </EuiFormRow>
    </Fragment>
  );
}
