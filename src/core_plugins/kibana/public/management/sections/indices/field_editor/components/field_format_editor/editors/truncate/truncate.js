import React, { Fragment } from 'react';

import {
  EuiFieldNumber,
  EuiFormRow,
} from '@elastic/eui';

import {
  DefaultFormatEditor
} from '../default';

import {
  FormatEditorSamples
} from '../../samples';

import {
  sample
} from './sample';

export class TruncateFormatEditor extends DefaultFormatEditor {
  static formatId = 'truncate';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [sample];
  }

  render() {
    const { formatParams } = this.props;
    const { error, samples } = this.state;

    return (
      <Fragment>
        <EuiFormRow
          label="Field length"
          isInvalid={!!error}
          error={error}
        >
          <EuiFieldNumber
            defaultValue={formatParams.fieldLength}
            onChange={(e) => {
              this.onChange('fieldLength', Number(e.target.value));
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

export const TruncateEditor = () => TruncateFormatEditor;
