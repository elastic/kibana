/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFormatEditor, defaultState } from '../default/default';

import { FormatEditorSamples } from '../../samples';

import { sample } from './sample';
import { formatId } from './constants';

interface TruncateFormatEditorFormatParams {
  fieldLength: number;
}

export class TruncateFormatEditor extends DefaultFormatEditor<TruncateFormatEditorFormatParams> {
  static formatId = formatId;
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
              id="indexPatternFieldEditor.truncate.lengthLabel"
              defaultMessage="Field length"
            />
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldNumber
            defaultValue={formatParams.fieldLength}
            min={1}
            data-test-subj={'truncateEditorLength'}
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
