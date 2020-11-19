/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './samples.scss';

import React, { PureComponent } from 'react';

import { EuiBasicTable, EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Sample } from '../../../types';

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
        name: i18n.translate('indexPatternManagement.samples.inputHeader', {
          defaultMessage: 'Input',
        }),
        render: (input: {} | string) => {
          return typeof input === 'object' ? JSON.stringify(input) : input;
        },
      },
      {
        field: 'output',
        name: i18n.translate('indexPatternManagement.samples.outputHeader', {
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
          <FormattedMessage id="indexPatternManagement.samplesHeader" defaultMessage="Samples" />
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
