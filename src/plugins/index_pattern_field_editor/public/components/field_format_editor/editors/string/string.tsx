/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiFormRow, EuiSelect } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor, defaultState } from '../default';

import { FormatEditorSamples } from '../../samples';

interface StringFormatEditorFormatParams {
  transform: string;
}

interface TransformOptions {
  kind: string;
  text: string;
}

export class StringFormatEditor extends DefaultFormatEditor<StringFormatEditorFormatParams> {
  static formatId = 'string';
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
    const { format, formatParams } = this.props;
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
            options={(format.type.transformOptions || []).map((option: TransformOptions) => {
              return {
                value: option.kind,
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
