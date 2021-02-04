/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiCode, EuiFieldText, EuiFormRow, EuiIcon, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor, defaultState } from '../default';

import { FormatEditorSamples } from '../../samples';

export interface NumberFormatEditorParams {
  pattern: string;
}

export class NumberFormatEditor extends DefaultFormatEditor<NumberFormatEditorParams> {
  static formatId = 'number';
  state = {
    ...defaultState,
    sampleInputs: [10000, 12.345678, -1, -999, 0.52],
  };

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;
    const defaultPattern = format.getParamDefaults().pattern;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternManagement.number.numeralLabel"
              defaultMessage="Numeral.js format pattern (Default: {defaultPattern})"
              values={{ defaultPattern: <EuiCode>{defaultPattern}</EuiCode> }}
            />
          }
          helpText={
            <span>
              <EuiLink target="_blank" href="https://adamwdraper.github.io/Numeral-js/">
                <FormattedMessage
                  id="indexPatternManagement.number.documentationLabel"
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
            onChange={(e) => {
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
