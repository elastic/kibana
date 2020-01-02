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

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';

// @ts-ignore
import numeralLanguages from '@elastic/numeral/languages';

import {
  EuiCode,
  EuiText,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiSelect,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';

import { DefaultFormatEditor } from '../default';

import { FormatEditorSamples } from '../../samples';

import { FormattedMessage } from '@kbn/i18n/react';

export class CustomNumberFormatEditor extends DefaultFormatEditor {
  static formatId = 'number';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [
      10000,
      12.345678,
      -1,
      -999,
      0.52,
      0.00000000000000123456789,
      19900000000000000000000,
    ];
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;
    const defaultPattern = format.getParamDefaults().pattern;
    const overrideLocale = formatParams.localeOverride;
    const locale = format.getConfig('format:number:defaultLocale');

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="common.ui.fieldEditor.number.numeralLabel"
              defaultMessage="Numeral.js format pattern (Default: {defaultPattern})"
              values={{ defaultPattern: <EuiCode>{defaultPattern}</EuiCode> }}
            />
          }
          helpText={
            <span>
              <EuiLink target="_blank" href="https://adamwdraper.github.io/Numeral-js/">
                <FormattedMessage
                  id="common.ui.fieldEditor.number.documentationLabel"
                  defaultMessage="Documentation"
                />
                &nbsp;
                <EuiIcon type="link" />
              </EuiLink>
            </span>
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldText
            value={formatParams.pattern}
            placeholder={defaultPattern}
            onChange={e => {
              this.onChange({ pattern: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>

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
                values: { locale },
              })}
            </EuiText>

            <EuiSpacer />

            <EuiSwitch
              checked={!!overrideLocale}
              label={i18n.translate('common.ui.fieldEditor.number.useLocaleOverride', {
                defaultMessage: 'Number formatting locale for this field',
              })}
              onChange={e => {
                if (e.target.checked) {
                  this.onChange({ localeOverride: locale });
                } else {
                  this.onChange({ localeOverride: false });
                }
              }}
            />
          </>
        </EuiFormRow>

        {overrideLocale ? (
          <EuiFormRow
            label={
              <FormattedMessage
                id="common.ui.fieldEditor.number.localeSelection"
                defaultMessage="Select locale to override with"
              />
            }
          >
            <EuiSelect
              options={numeralLanguages.map(lang => ({
                value: lang.id,
                text: lang.name || lang.id,
              }))}
              onChange={e => {
                this.onChange({ localeOverride: e.target.value });
              }}
              value={overrideLocale}
            />
          </EuiFormRow>
        ) : null}

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
