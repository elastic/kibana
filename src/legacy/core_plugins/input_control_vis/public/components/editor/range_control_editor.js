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
import React from 'react';
import { IndexPatternSelectFormRow } from './index_pattern_select_form_row';
import { FieldSelect } from './field_select';

import {
  EuiFormRow,
  EuiFieldNumber,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

function filterField(field) {
  return field.type === 'number';
}

export function RangeControlEditor(props) {
  const stepSizeId = `stepSize-${props.controlIndex}`;
  const decimalPlacesId = `decimalPlaces-${props.controlIndex}`;
  const handleDecimalPlacesChange = (evt) => {
    props.handleNumberOptionChange(props.controlIndex, 'decimalPlaces', evt);
  };
  const handleStepChange = (evt) => {
    props.handleNumberOptionChange(props.controlIndex, 'step', evt);
  };
  return (
    <div>

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
        label={<FormattedMessage
          id="inputControl.editor.rangeControl.stepSizeLabel"
          defaultMessage="Step Size"
        />}
      >
        <EuiFieldNumber
          value={props.controlParams.options.step}
          onChange={handleStepChange}
          data-test-subj={`rangeControlSizeInput${props.controlIndex}`}
        />
      </EuiFormRow>

      <EuiFormRow
        id={decimalPlacesId}
        label={<FormattedMessage
          id="inputControl.editor.rangeControl.decimalPlacesLabel"
          defaultMessage="Decimal Places"
        />}
      >
        <EuiFieldNumber
          min={0}
          value={props.controlParams.options.decimalPlaces}
          onChange={handleDecimalPlacesChange}
          data-test-subj={`rangeControlDecimalPlacesInput${props.controlIndex}`}
        />
      </EuiFormRow>

    </div>
  );
}

RangeControlEditor.propTypes = {
  getIndexPattern: PropTypes.func.isRequired,
  controlIndex: PropTypes.number.isRequired,
  controlParams: PropTypes.object.isRequired,
  handleFieldNameChange: PropTypes.func.isRequired,
  handleIndexPatternChange: PropTypes.func.isRequired,
  handleNumberOptionChange: PropTypes.func.isRequired
};
