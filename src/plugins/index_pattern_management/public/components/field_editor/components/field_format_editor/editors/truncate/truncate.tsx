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

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor, defaultState } from '../default';

import { FormatEditorSamples } from '../../samples';

import { sample } from './sample';

interface TruncateFormatEditorFormatParams {
  fieldLength: number;
}

export class TruncateFormatEditor extends DefaultFormatEditor<TruncateFormatEditorFormatParams> {
  static formatId = 'truncate';
  state = {
    ...defaultState,
    sampleInputs: [sample],
  };

  render() {
    const { formatParams, onError } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.truncate.lengthLabel"
              defaultMessage="Field length"
            />
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldNumber
            defaultValue={formatParams.fieldLength}
            min={1}
            onChange={(e) => {
              if (e.target.checkValidity()) {
                this.onChange({
                  fieldLength: e.target.value ? Number(e.target.value) : null,
                });
              } else {
                onError(e.target.validationMessage);
              }
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
