/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import moment from 'moment';

import { EuiCode, EuiFieldText, EuiFormRow, EuiIcon, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFormatEditor, defaultState } from '../default/default';
import { formatId } from './constants';

import { FormatEditorSamples } from '../../samples';

interface DateFormatEditorFormatParams {
  pattern: string;
}

export class DateFormatEditor extends DefaultFormatEditor<DateFormatEditorFormatParams> {
  static formatId = formatId;
  state = {
    ...defaultState,
    sampleInputs: [
      Date.now(),
      moment().startOf('year').valueOf(),
      moment().endOf('year').valueOf(),
    ],
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
              id="indexPatternFieldEditor.date.momentLabel"
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
                  id="indexPatternFieldEditor.date.documentationLabel"
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
