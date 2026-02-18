/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PureComponent } from 'react';
import { css } from '@emotion/react';

import { EuiBasicTable, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { FormattedValue } from '@kbn/field-formats-plugin/common';
import type { Sample, SampleInput } from '../types';

interface FormatEditorSamplesProps {
  samples: Sample[];
  sampleType: string;
  fieldFormat?: FieldFormat;
}

export class FormatEditorSamples extends PureComponent<FormatEditorSamplesProps> {
  static defaultProps = {
    sampleType: 'text',
  };

  render() {
    const { samples, sampleType, fieldFormat } = this.props;

    const columns = [
      {
        field: 'input',
        name: i18n.translate('indexPatternFieldEditor.samples.inputHeader', {
          defaultMessage: 'Input',
        }),
        render: (input: {} | string) => {
          return (typeof input === 'object' ? JSON.stringify(input) : input) as string;
        },
      },
      {
        field: 'output',
        name: i18n.translate('indexPatternFieldEditor.samples.outputHeader', {
          defaultMessage: 'Output',
        }),
        render: (output: string, sample: Sample) => {
          if (sampleType === 'react' && fieldFormat) {
            return (
              <div>
                <FormattedValue fieldFormat={fieldFormat} value={sample.input as SampleInput} />
              </div>
            );
          }
          return <div>{output}</div>;
        },
      },
    ];

    return samples.length ? (
      <EuiFormRow
        label={
          <FormattedMessage id="indexPatternFieldEditor.samplesHeader" defaultMessage="Samples" />
        }
      >
        <EuiBasicTable<Sample>
          className="kbnFieldFormatEditor__samples"
          css={styles.samples}
          compressed={true}
          items={samples}
          columns={columns}
          tableCaption={i18n.translate('indexPatternFieldEditor.samples.tableCaption', {
            defaultMessage: 'Sample input and output values',
          })}
        />
      </EuiFormRow>
    ) : null;
  }
}

const styles = {
  samples: css`
    audio {
      max-width: 100%;
    }
  `,
};
