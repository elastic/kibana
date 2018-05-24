import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiFormRow,
} from '@elastic/eui';


export class FormatEditorSamples extends PureComponent {
  static propTypes = {
    samples: PropTypes.arrayOf(PropTypes.shape({
      input: PropTypes.any.isRequired,
      output: PropTypes.any.isRequired,
    })).isRequired,
  };

  render() {
    const { samples } = this.props;

    const columns = [
      {
        field: 'input',
        name: 'Input',
      },
      {
        field: 'output',
        name: 'Output',
      }
    ];


    return samples.length ? (
      <EuiFormRow
        label="Samples"
      >
        <EuiBasicTable
          compressed={true}
          items={samples}
          columns={columns}
        />
      </EuiFormRow>
    ) : null;
  }
}
