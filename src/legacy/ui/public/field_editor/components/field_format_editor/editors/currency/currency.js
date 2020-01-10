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

// Top 35 most traded currencies per https://en.wikipedia.org/wiki/Template:Most_traded_currencies
// This list is not a full list of currencies, but the ISO standard full list of currencies
// does not provide some of the amenities of this Wiki list- a mashup of sources would be required
// to provide country name, currency name, and currency symbol.
// The full ISO reference: https://www.currency-iso.org/en/home/tables/table-a1.html
const topCurrencies = [
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.USD', {
      defaultMessage: 'United States dollar',
    }),
    code: 'USD',
    symbol: 'US$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.EUR', {
      defaultMessage: 'Euro',
    }),
    code: 'EUR',
    symbol: '€',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.JPY', {
      defaultMessage: 'Japanese yen',
    }),
    code: 'JPY',
    symbol: '¥',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.GBP', {
      defaultMessage: 'Pound sterling',
    }),
    code: 'GBP',
    symbol: '£',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.AUD', {
      defaultMessage: 'Australian dollar',
    }),
    code: 'AUD',
    symbol: 'A$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.CAD', {
      defaultMessage: 'Canadian dollar',
    }),
    code: 'CAD',
    symbol: 'C$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.CHF', {
      defaultMessage: 'Swiss franc',
    }),
    code: 'CHF',
    symbol: 'CHF',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.CNY', {
      defaultMessage: 'Renminbi',
    }),
    code: 'CNY',
    symbol: '元',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.HKD', {
      defaultMessage: 'Hong Kong dollar',
    }),
    code: 'HKD',
    symbol: 'HK$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.NZD', {
      defaultMessage: 'New Zealand dollar',
    }),
    code: 'NZD',
    symbol: 'NZ$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.SEK', {
      defaultMessage: 'Swedish krona',
    }),
    code: 'SEK',
    symbol: 'kr',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.KRW', {
      defaultMessage: 'South Korean won',
    }),
    code: 'KRW',
    symbol: '₩',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.SGD', {
      defaultMessage: 'Singapore dollar',
    }),
    code: 'SGD',
    symbol: 'S$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.NOK', {
      defaultMessage: 'Norwegian krone',
    }),
    code: 'NOK',
    symbol: 'kr',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.MXN', {
      defaultMessage: 'Mexican peso',
    }),
    code: 'MXN',
    symbol: '$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.INR', {
      defaultMessage: 'Indian rupee',
    }),
    code: 'INR',
    symbol: '₹',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.RUB', {
      defaultMessage: 'Russian ruble',
    }),
    code: 'RUB',
    symbol: '₽',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.ZAR', {
      defaultMessage: 'South African rand',
    }),
    code: 'ZAR',
    symbol: 'R',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.TRY', {
      defaultMessage: 'Turkish lira',
    }),
    code: 'TRY',
    symbol: '₺',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.BRL', {
      defaultMessage: 'Brazilian real',
    }),
    code: 'BRL',
    symbol: 'R$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.TWD', {
      defaultMessage: 'New Taiwan dollar',
    }),
    code: 'TWD',
    symbol: 'NT$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.DKK', {
      defaultMessage: 'Danish krone',
    }),
    code: 'DKK',
    symbol: 'kr',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.PLN', {
      defaultMessage: 'Polish zloty',
    }),
    code: 'PLN',
    symbol: 'zł',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.THB', {
      defaultMessage: 'Thai baht',
    }),
    code: 'THB',
    symbol: '฿',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.IDR', {
      defaultMessage: 'Indonesian rupiah',
    }),
    code: 'IDR',
    symbol: 'Rp',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.HUF', {
      defaultMessage: 'Hungarian forint',
    }),
    code: 'HUF',
    symbol: 'Ft',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.CZK', {
      defaultMessage: 'Czech koruna',
    }),
    code: 'CZK',
    symbol: 'Kč',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.ILS', {
      defaultMessage: 'Israeli new shekel',
    }),
    code: 'ILS',
    symbol: '₪',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.CLP', {
      defaultMessage: 'Chilean peso',
    }),
    code: 'CLP',
    symbol: 'CLP$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.PHP', {
      defaultMessage: 'Philippine peso',
    }),
    code: 'PHP',
    symbol: '₱',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.AED', {
      defaultMessage: 'UAE dirham',
    }),
    code: 'AED',
    symbol: 'د.إ',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.COP', {
      defaultMessage: 'Colombian peso',
    }),
    code: 'COP',
    symbol: 'COL$',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.SAR', {
      defaultMessage: 'Saudi riyal',
    }),
    code: 'SAR',
    symbol: '﷼',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.MYR', {
      defaultMessage: 'Malaysian ringgit',
    }),
    code: 'MYR',
    symbol: 'RM',
  },
  {
    name: i18n.translate('common.ui.fieldEditor.currency.currencies.RON', {
      defaultMessage: 'Romanian leu',
    }),
    code: 'RON',
    symbol: 'L',
  },
];

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
