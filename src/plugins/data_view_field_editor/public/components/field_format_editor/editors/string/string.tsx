/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DefaultFormatEditor, defaultState } from '../default/default';

import { FormatEditorSamples } from '../../samples';
import { formatId } from './constants';
import { StringFormat } from '../../../../../../field_formats/common';

interface StringFormatEditorFormatParams {
  transform: string;
}

export class StringFormatEditor extends DefaultFormatEditor<StringFormatEditorFormatParams> {
  static formatId = formatId;
  state = {
    ...defaultState,
    sampleInputs: [
      'A Quick Brown Fox.',
      'STAY CALM!',
      'com.organizations.project.ClassName',
      'hostname.net',
      'SGVsbG8gd29ybGQ=',
      '%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98',
    ],
  };

  render() {
    const { formatParams, format } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.string.transformLabel"
              defaultMessage="Transform"
            />
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiSelect
            data-test-subj="stringEditorTransform"
            defaultValue={formatParams.transform}
            options={((format.type as typeof StringFormat).transformOptions || []).map((option) => {
              return {
                value: option.kind as string,
                text: option.text,
              };
            })}
            onChange={(e) => {
              this.onChange({ transform: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <FormatEditorSamples samples={samples} />
      </Fragment>
    );
  }
}
