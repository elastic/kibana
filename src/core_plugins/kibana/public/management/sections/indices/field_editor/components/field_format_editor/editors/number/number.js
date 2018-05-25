import React, { Fragment } from 'react';

import {
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';

import {
  DefaultFormatEditor
} from '../default';

import {
  FormatEditorSamples
} from '../../samples';

export class NumberFormatEditor extends DefaultFormatEditor {
  static formatId = 'number';

  constructor(props) {
    super(props);
    this.state.sampleInputs = [10000, 12.345678, -1, -999, 0.52];
  }

  render() {
    const { format, formatParams } = this.props;
    const { error, samples } = this.state;
    const defaultPattern = format.getParamDefaults().pattern;

    return (
      <Fragment>
        <EuiFormRow
          label={
            <span>
              Numeral.js format pattern (Default: <EuiCode>{defaultPattern}</EuiCode>)
            </span>
          }
          helpText={
            <span>
              <EuiLink target="_window" href="https://adamwdraper.github.io/Numeral-js/">
                Documentation <EuiIcon type="link" />
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
              this.onChange('pattern', e.target.value);
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

export const NumberEditor = () => NumberFormatEditor;
