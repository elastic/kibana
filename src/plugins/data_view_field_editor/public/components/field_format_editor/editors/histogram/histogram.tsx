/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSelect, EuiFieldText, EuiFormRow, EuiIcon, EuiLink } from '@elastic/eui';
import { DefaultFormatEditor, defaultState } from '../default/default';
import { FormatEditorSamples } from '../../samples';
import { formatId } from './constants';

export interface HistogramFormatEditorParams {
  id: 'bytes' | 'percent' | 'number';
  params: { pattern?: string } & Record<string, unknown>;
}

export class HistogramFormatEditor extends DefaultFormatEditor<HistogramFormatEditorParams> {
  static formatId = formatId;
  state = {
    ...defaultState,
    sampleInputs: [
      50.1234,
      100.0001,
      99.9999,
      { values: [0.00001, 99.9999, 200, 300], counts: [573, 102, 482] },
    ],
  };

  render() {
    const { formatParams } = this.props;
    const { error, samples } = this.state;

    const numberOptions = [
      {
        value: 'number',
        text: i18n.translate('indexPatternFieldEditor.histogram.subFormat.number', {
          defaultMessage: 'Number',
        }),
      },
      {
        value: 'bytes',
        text: i18n.translate('indexPatternFieldEditor.histogram.subFormat.bytes', {
          defaultMessage: 'Bytes',
        }),
      },
      {
        value: 'percent',
        text: i18n.translate('indexPatternFieldEditor.histogram.subFormat.percent', {
          defaultMessage: 'Percentage',
        }),
      },
    ];

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('indexPatternFieldEditor.histogram.histogramAsNumberLabel', {
            defaultMessage: 'Aggregated number format',
          })}
        >
          <EuiSelect
            options={numberOptions}
            value={formatParams.id || 'number'}
            onChange={(e) => {
              this.onChange({ id: e.target.value });
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('indexPatternFieldEditor.histogram.numeralLabel', {
            defaultMessage: 'Numeral format pattern (optional)',
          })}
          helpText={
            <span>
              <EuiLink target="_blank" href="https://adamwdraper.github.io/Numeral-js/">
                <FormattedMessage
                  id="indexPatternFieldEditor.number.documentationLabel"
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
            value={formatParams?.params?.pattern ?? ''}
            onChange={(e) => {
              this.onChange({
                params: {
                  pattern: e.target.value,
                },
              });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>

        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
