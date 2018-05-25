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

export class DurationFormatEditor extends DefaultFormatEditor {
  static formatId = 'duration';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [-123, 1, 12, 123, 658, 1988, 3857, 123292, 923528271];
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label="Input format"
          isInvalid={!!error}
          error={error}
        >
          <EuiSelect
            value={formatParams.inputFormat}
            options={format.type.inputFormats.map(format => {
              return {
                value: format.kind,
                text: format.text,
              };
            })}
            onChange={(e) => {
              this.onChange('inputFormat', e.target.value);
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <EuiFormRow
          label="Output format"
          isInvalid={!!error}
          error={error}
        >
          <EuiSelect
            value={formatParams.outputFormat}
            options={format.type.outputFormats.map(format => {
              return {
                value: format.kind,
                text: format.text,
              };
            })}
            onChange={(e) => {
              this.onChange('inputFormat', e.target.value);
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

export const DurationEditor = () => DurationFormatEditor;
