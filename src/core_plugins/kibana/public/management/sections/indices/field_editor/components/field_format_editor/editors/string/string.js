import React, { Fragment } from 'react';

import {
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';

import {
  DefaultFormatEditor
} from '../default';

import {
  FormatEditorSamples
} from '../../samples';

export class StringFormatEditor extends DefaultFormatEditor {
  static formatId = 'string';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [
      'A Quick Brown Fox.',
      'STAY CALM!',
      'com.organizations.project.ClassName',
      'hostname.net',
      'SGVsbG8gd29ybGQ='
    ];
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label="Transform"
          isInvalid={!!error}
          error={error}
        >
          <EuiSelect
            defaultValue={formatParams.transform}
            options={format.type.transformOptions.map(option => {
              return {
                value: option.kind,
                text: option.text,
              };
            })}
            onChange={(e) => {
              this.onChange('transform', e.target.value);
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <FormatEditorSamples
          samples={samples}
        />
      </Fragment>
    );
  }
}

export const StringEditor = () => StringFormatEditor;
