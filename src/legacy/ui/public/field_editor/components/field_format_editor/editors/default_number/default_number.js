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

import React, { Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiFieldNumber } from '@elastic/eui';

import { DefaultFormatEditor } from '../default';

import { FormatEditorSamples } from '../../samples';

export class DefaultNumberFormatEditor extends DefaultFormatEditor {
  static formatId = 'default_number';

  constructor(props) {
    super(props);
    this.state = {
      ...this.state,
      sampleInputs: [
        10000,
        12.345678,
        -1,
        -999,
        0.52,
        0.00000000000000123456789,
        19900000000000000000000,
      ],
    };
  }

  renderDecimalSelector = () => {
    const { formatParams } = this.props;

    return (
      <>
        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.defaultNumber.minDecimalPlacesLabel"
              defaultMessage="Minimum decimal places"
            />
          }
        >
          <EuiFieldNumber
            value={formatParams.minDecimals}
            min={0}
            max={20}
            onChange={e => {
              this.onChange({ minDecimals: Number(e.target.value) || 0 });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.defaultNumber.maxDecimalPlacesLabel"
              defaultMessage="Maximum decimal places"
            />
          }
        >
          <EuiFieldNumber
            value={formatParams.maxDecimals}
            min={0}
            max={20}
            onChange={e => {
              this.onChange({ maxDecimals: Number(e.target.value) || 0 });
            }}
          />
        </EuiFormRow>
      </>
    );
  };

  render() {
    const { samples } = this.state;

    return (
      <Fragment>
        {this.renderDecimalSelector()}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
