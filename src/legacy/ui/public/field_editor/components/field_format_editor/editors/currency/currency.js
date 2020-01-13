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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFormRow, EuiComboBox, EuiFieldText } from '@elastic/eui';

import { DefaultNumberFormatEditor } from '../default_number';
import { FormatEditorSamples } from '../../samples';

const topCurrencies = i18n.getKnownCurrencies();

export class CurrencyFormatEditor extends DefaultNumberFormatEditor {
  static formatId = 'currency';

  constructor(props) {
    super(props);

    this.state = {
      ...this.state,
      sampleInputs: [1234, 99.9999, 5150000.0001, 0.00005],
      hasOther: false,
    };
  }

  render() {
    const { formatParams } = this.props;
    const { samples } = this.state;
    const currencyCode = formatParams.currencyCode;
    const currencyMatch = topCurrencies.find(cur => cur.code === currencyCode);
    let currencyLabel = currencyCode;
    if (currencyMatch) {
      currencyLabel = `${currencyMatch.name} (${currencyMatch.code}) ${currencyMatch.symbol}`;
    }

    const otherLabel = {
      value: null,
      label: i18n.translate('common.ui.fieldEditor.currency.otherCurrencyLabel', {
        defaultMessage: 'Other currency',
      }),
    };

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.currency.currencyCodeLabel"
              defaultMessage="Select currency"
            />
          }
        >
          <EuiComboBox
            fullWidth
            compressed
            isClearable={false}
            selectedOptions={
              this.state.hasOther ? [otherLabel] : [{ value: currencyCode, label: currencyLabel }]
            }
            singleSelection={{ asPlainText: true }}
            options={topCurrencies
              .map(cur => ({
                value: cur.code,
                label: `${cur.name} (${cur.code}) ${cur.symbol}`,
              }))
              .concat([otherLabel])}
            onChange={choices => {
              if (choices[0].value) {
                // There is no value for the "Other" currency
                this.onChange({ currencyCode: choices[0].value });
                this.setState({ hasOther: false });
              } else {
                this.setState({ hasOther: true });
              }
            }}
          />
        </EuiFormRow>

        {this.state.hasOther ? (
          <EuiFormRow
            label={i18n.translate('common.ui.fieldEditor.currency.otherCurrencyLabel', {
              defaultMessage: 'Other currency',
            })}
          >
            <EuiFieldText
              value={currencyCode}
              onChange={e => {
                this.onChange({ currencyCode: e.target.value ? e.target.value.toUpperCase() : '' });
              }}
            />
          </EuiFormRow>
        ) : null}

        {this.renderDecimalSelector()}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
