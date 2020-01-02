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
import { EuiFormRow, EuiFieldNumber, EuiText, EuiSpacer, EuiSwitch, EuiSelect } from '@elastic/eui';

import { DefaultFormatEditor } from '../default';

import { FormatEditorSamples } from '../../samples';

// List of supported Chrome locales
const locales = {
  af: 'Afrikaans',
  am: 'Amharic',
  ar: 'Arabic',
  az: 'Azerbaijani',
  be: 'Belarusian',
  bg: 'Bulgarian',
  bh: 'Bihari',
  bn: 'Bengali',
  br: 'Breton',
  bs: 'Bosnian',
  ca: 'Catalan',
  co: 'Corsican',
  cs: 'Czech',
  cy: 'Welsh',
  da: 'Danish',
  de: 'German',
  'de-AT': 'German (Austria)',
  'de-CH': 'German (Switzerland)',
  'de-DE': 'German (Germany)',
  el: 'Greek',
  en: 'English',
  'en-US': 'English (US)',
  'en-IN': 'English (India)',
  'en-NG': 'English (Nigeria)',
  'en-PK': 'English (Pakistan)',
  'en-PH': 'English (Philippines)',
  'en-GB': 'English (UK)',
  'en-CA': 'English (Canada)',
  'en-AU': 'English (Australia)',
  'en-NZ': 'English (New Zealand)',
  'en-ZA': 'English (South Africa)',
  eo: 'Esperanto',
  es: 'Spanish',
  'es-419': 'Spanish (Latin America)',
  et: 'Estonian',
  eu: 'Basque',
  fa: 'Persian',
  fi: 'Finnish',
  fil: 'Filipino',
  fo: 'Faroese',
  fr: 'French',
  'fr-CA': 'French (Canada)',
  'fr-CH': 'French (Switzerland)',
  'fr-FR': 'French (France)',
  fy: 'Frisian',
  ga: 'Irish',
  gd: 'Scots Gaelic',
  gl: 'Galician',
  gn: 'Guarani',
  gu: 'Gujarati',
  ha: 'Hausa',
  haw: 'Hawaiian',
  he: 'Hebrew',
  hi: 'Hindi',
  hr: 'Croatian',
  hu: 'Hungarian',
  hy: 'Armenian',
  ia: 'Interlingua',
  id: 'Indonesian',
  is: 'Icelandic',
  it: 'Italian',
  'it-CH': 'Italian (Switzerland)',
  'it-IT': 'Italian (Italy)',
  ja: 'Japanese',
  jw: 'Javanese',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Cambodian',
  kn: 'Kannada',
  ko: 'Korean',
  ku: 'Kurdish',
  ky: 'Kyrgyz',
  la: 'Latin',
  ln: 'Lingala',
  lo: 'Laothian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mo: 'Moldavian',
  mr: 'Marathi',
  ms: 'Malay',
  mt: 'Maltese',
  nb: 'Norwegian (Bokmal)',
  ne: 'Nepali',
  nl: 'Dutch',
  nn: 'Norwegian (Nynorsk)',
  no: 'Norwegian',
  oc: 'Occitan',
  om: 'Oromo',
  or: 'Oriya',
  pa: 'Punjabi',
  pl: 'Polish',
  ps: 'Pashto',
  pt: 'Portuguese',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  qu: 'Quechua',
  rm: 'Romansh',
  ro: 'Romanian',
  ru: 'Russian',
  sd: 'Sindhi',
  sh: 'Serbo-Croatian',
  si: 'Sinhalese',
  sk: 'Slovak',
  sl: 'Slovenian',
  sn: 'Shona',
  so: 'Somali',
  sq: 'Albanian',
  sr: 'Serbian',
  st: 'Sesotho',
  su: 'Sundanese',
  sv: 'Swedish',
  sw: 'Swahili',
  ta: 'Tamil',
  te: 'Telugu',
  tg: 'Tajik',
  th: 'Thai',
  ti: 'Tigrinya',
  tk: 'Turkmen',
  to: 'Tonga',
  tr: 'Turkish',
  tt: 'Tatar',
  tw: 'Twi',
  ug: 'Uighur',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  xh: 'Xhosa',
  yi: 'Yiddish',
  yo: 'Yoruba',
  zh: 'Chinese',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  zu: 'Zulu',
};

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
      supportedLocales: Intl.NumberFormat.supportedLocalesOf(Object.keys(locales)),
    };
  }

  renderLocaleOverride = () => {
    const { formatParams } = this.props;

    const defaultLocale = this.props.format.getConfig('format:number:defaultLocale');

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.number.overrideLocaleLabel"
              defaultMessage="Override locale"
            />
          }
        >
          <>
            <EuiText size="s">
              {i18n.translate('common.ui.fieldEditor.numberLocaleLabel', {
                defaultMessage:
                  'Number formatting is set to ({locale}) by the Kibana advanced setting "format:number:defaultLocale".',
                values: { locale: defaultLocale },
              })}
            </EuiText>

            <EuiSpacer />

            <EuiSwitch
              checked={!!formatParams.localeOverride}
              label={i18n.translate('common.ui.fieldEditor.currency.overrideLocale', {
                defaultMessage: 'Override the locale for this field',
              })}
              onChange={e => {
                this.onChange({ localeOverride: e.target.checked });
              }}
            />
          </>
        </EuiFormRow>

        {formatParams.localeOverride ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="common.ui.fieldEditor.currency.localeSelection"
                defaultMessage="Select locale to override with"
              />
            }
          >
            <EuiSelect
              options={[
                {
                  value: null,
                  text: i18n.translate('common.ui.fieldEditor.currency.localeDefault', {
                    defaultMessage: 'Use Kibana locale {locale}',
                    values: { locale: this.props.format.getConfig('format:number:defaultLocale') },
                  }),
                },
              ].concat(
                this.state.supportedLocales.map(localeId => ({
                  value: localeId,
                  text: locales[localeId],
                }))
              )}
              onChange={e => {
                this.onChange({ localeOverride: e.target.value });
              }}
              value={formatParams.localeOverride || null}
            />
          </EuiFormRow>
        ) : null}
      </Fragment>
    );
  };

  render() {
    const { formatParams } = this.props;
    const { samples } = this.state;

    return (
      <Fragment>
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

        {this.renderLocaleOverride()}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
