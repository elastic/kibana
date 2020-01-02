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
import { EuiFormRow, EuiComboBox } from '@elastic/eui';

import { DefaultNumberFormatEditor } from '../default_number';
import { FormatEditorSamples } from '../../samples';

// Top 35 most traded currencies per https://en.wikipedia.org/wiki/Template:Most_traded_currencies
// This list is not a full list of currencies, but the ISO standard full list of currencies
// does not provide some of the amenities of this Wiki list- a mashup of sources would be required
// to provide country name, currency name, and currency symbol.
// The full ISO reference: https://www.currency-iso.org/en/home/tables/table-a1.html
const topCurrencies = [
  { name: 'United States dollar', code: 'USD', symbol: 'US$' },
  { name: 'Euro', code: 'EUR', symbol: '€' },
  { name: 'Japanese yen', code: 'JPY', symbol: '¥' },
  { name: 'Pound sterling', code: 'GBP', symbol: '£' },
  { name: 'Australian dollar', code: 'AUD', symbol: 'A$' },
  { name: 'Canadian dollar', code: 'CAD', symbol: 'C$' },
  { name: 'Swiss franc', code: 'CHF', symbol: 'CHF' },
  { name: 'Renminbi', code: 'CNY', symbol: '元' },
  { name: 'Hong Kong dollar', code: 'HKD', symbol: 'HK$' },
  { name: 'New Zealand dollar', code: 'NZD', symbol: 'NZ$' },
  { name: 'Swedish krona', code: 'SEK', symbol: 'kr' },
  { name: 'South Korean won', code: 'KRW', symbol: '₩' },
  { name: 'Singapore dollar', code: 'SGD', symbol: 'S$' },
  { name: 'Norwegian krone', code: 'NOK', symbol: 'kr' },
  { name: 'Mexican peso', code: 'MXN', symbol: '$' },
  { name: 'Indian rupee', code: 'INR', symbol: '₹' },
  { name: 'Russian ruble', code: 'RUB', symbol: '₽' },
  { name: 'South African rand', code: 'ZAR', symbol: 'R' },
  { name: 'Turkish lira', code: 'TRY', symbol: '₺' },
  { name: 'Brazilian real', code: 'BRL', symbol: 'R$' },
  { name: 'New Taiwan dollar', code: 'TWD', symbol: 'NT$' },
  { name: 'Danish krone', code: 'DKK', symbol: 'kr' },
  { name: 'Polish zloty', code: 'PLN', symbol: 'zł' },
  { name: 'Thai baht', code: 'THB', symbol: '฿' },
  { name: 'Indonesian rupiah', code: 'IDR', symbol: 'Rp' },
  { name: 'Hungarian forint', code: 'HUF', symbol: 'Ft' },
  { name: 'Czech koruna', code: 'CZK', symbol: 'Kč' },
  { name: 'Israeli new shekel', code: 'ILS', symbol: '₪' },
  { name: 'Chilean peso', code: 'CLP', symbol: 'CLP$' },
  { name: 'Philippine peso', code: 'PHP', symbol: '₱' },
  { name: 'UAE dirham', code: 'AED', symbol: 'د.إ' },
  { name: 'Colombian peso', code: 'COP', symbol: 'COL$' },
  { name: 'Saudi riyal', code: 'SAR', symbol: '﷼' },
  { name: 'Malaysian ringgit', code: 'MYR', symbol: 'RM' },
  { name: 'Romanian leu', code: 'RON', symbol: 'L' },
];

export class CurrencyFormatEditor extends DefaultNumberFormatEditor {
  static formatId = 'currency';

  constructor(props) {
    super(props);

    this.state = {
      ...this.state,
      sampleInputs: [1234, 99.9999, 5150000.0001, 0.00005],
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
            selectedOptions={[{ value: currencyCode, label: currencyLabel }]}
            singleSelection={{ asPlainText: true }}
            options={topCurrencies.map(cur => ({
              value: cur.code,
              label: `${cur.name} (${cur.code}) ${cur.symbol}`,
            }))}
            onChange={choices => {
              this.onChange({ currencyCode: choices[0].value });
            }}
          />
        </EuiFormRow>

        {this.renderLocaleOverride()}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
