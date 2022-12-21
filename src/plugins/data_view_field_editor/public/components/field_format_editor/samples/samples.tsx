/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './samples.scss';

import React, { PureComponent } from 'react';

import { EuiBasicTable, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Sample } from '../types';

interface FormatEditorSamplesProps {
  samples: Sample[];
  sampleType: string;
}

export class FormatEditorSamples extends PureComponent<FormatEditorSamplesProps> {
  static defaultProps = {
    sampleType: 'text',
  };

  render() {
    const { samples, sampleType } = this.props;

    const columns = [
      {
        field: 'input',
        name: i18n.translate('indexPatternFieldEditor.samples.inputHeader', {
          defaultMessage: 'Input',
        }),
        render: (input: {} | string) => {
          return typeof input === 'object' ? JSON.stringify(input) : input;
        },
      },
      {
        field: 'output',
        name: i18n.translate('indexPatternFieldEditor.samples.outputHeader', {
          defaultMessage: 'Output',
        }),
        render: (output: string) => {
          return sampleType === 'html' ? (
            <div
              /*
               * Justification for dangerouslySetInnerHTML:
               * Sample output may contain HTML tags, like URL image/audio format.
               */
              dangerouslySetInnerHTML={{ __html: output }} // eslint-disable-line react/no-danger
            />
          ) : (
            <div>{output}</div>
          );
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
          compressed={true}
          items={samples}
          columns={columns}
        />
      </EuiFormRow>
    ) : null;
  }
}
