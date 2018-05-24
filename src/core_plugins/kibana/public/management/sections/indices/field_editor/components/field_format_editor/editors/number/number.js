import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiCode,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
} from '@elastic/eui';

import {
  FormatEditorSamples
} from '../../samples';

export class NumberFormatEditor extends PureComponent {
  static formatId = 'number';

  static propTypes = {
    format: PropTypes.object.isRequired,
    formatParams: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      sampleInputs: [10000, 12.345678, -1, -999, 0.52],
      error: null,
      samples: [],
    };
  }

  static getDerivedStateFromProps(nextProps, state) {
    const converter = nextProps.format.getConverterFor('text');
    let error = null;
    let samples = [];

    try {
      samples = state.sampleInputs.map(input => {
        return {
          input,
          output: converter(input),
        };
      });
    } catch(e) {
      error = e.message;
    }

    return {
      error,
      samples,
    };
  }

  onPatternChange = (e) => {
    const { onChange, formatParams } = this.props;
    const pattern = e.target.value;
    onChange({
      ...formatParams,
      pattern,
    });
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
          error={error ? [
            'An error occured while trying to use this format configuration:',
            error
          ] : null}
        >
          <EuiFieldText
            value={formatParams.pattern}
            placeholder={defaultPattern}
            onChange={this.onPatternChange}
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
