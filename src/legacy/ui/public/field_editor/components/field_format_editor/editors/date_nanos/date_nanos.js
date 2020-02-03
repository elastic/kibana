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

import { EuiCode, EuiFieldText, EuiFormRow, EuiIcon, EuiLink } from '@elastic/eui';

import { DefaultFormatEditor } from '../default';

import { FormatEditorSamples } from '../../samples';

import { FormattedMessage } from '@kbn/i18n/react';

export class DateNanosFormatEditor extends DefaultFormatEditor {
  static formatId = 'date_nanos';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [
      '2015-01-01T12:10:30.123456789Z',
      '2019-05-08T06:55:21.567891234Z',
      '2019-08-06T17:22:30.987654321Z',
    ];
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;
    const defaultPattern = format.getParamDefaults().pattern;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.date.momentLabel"
              defaultMessage="Moment.js format pattern (Default: {defaultPattern})"
              values={{
                defaultPattern: <EuiCode>{defaultPattern}</EuiCode>,
              }}
            />
          }
          isInvalid={!!error}
          error={error}
          helpText={
            <span>
              <EuiLink target="_blank" href="https://momentjs.com/">
                <FormattedMessage
                  id="common.ui.fieldEditor.date.documentationLabel"
                  defaultMessage="Documentation"
                />
                &nbsp;
                <EuiIcon type="link" />
              </EuiLink>
            </span>
          }
        >
          <EuiFieldText
            data-test-subj="dateEditorPattern"
            value={formatParams.pattern}
            placeholder={defaultPattern}
            onChange={e => {
              this.onChange({ pattern: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
