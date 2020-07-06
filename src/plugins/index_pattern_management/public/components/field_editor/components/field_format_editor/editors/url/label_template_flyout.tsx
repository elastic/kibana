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

import React from 'react';

import { EuiBasicTable, EuiCode, EuiFlyout, EuiFlyoutBody, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface LabelTemplateExampleItem {
  input: string | number;
  urlTemplate: string;
  labelTemplate: string;
  output: string;
}

const items: LabelTemplateExampleItem[] = [
  {
    input: 1234,
    urlTemplate: 'http://company.net/profiles?user_id={{value}}',
    labelTemplate: i18n.translate('indexPatternManagement.labelTemplate.example.idLabel', {
      defaultMessage: 'User #{value}',
      values: { value: '{{value}}' },
    }),
    output:
      '<a href="http://company.net/profiles?user_id=1234">' +
      i18n.translate('indexPatternManagement.labelTemplate.example.output.idLabel', {
        defaultMessage: 'User',
      }) +
      ' #1234</a>',
  },
  {
    input: '/assets/main.css',
    urlTemplate: 'http://site.com{{rawValue}}',
    labelTemplate: i18n.translate('indexPatternManagement.labelTemplate.example.pathLabel', {
      defaultMessage: 'View Asset',
    }),
    output:
      '<a href="http://site.com/assets/main.css">' +
      i18n.translate('indexPatternManagement.labelTemplate.example.output.pathLabel', {
        defaultMessage: 'View Asset',
      }) +
      '</a>',
  },
];

export const LabelTemplateFlyout = ({ isVisible = false, onClose = () => {} }) => {
  return isVisible ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutBody>
        <EuiText>
          <h3>
            <FormattedMessage
              id="indexPatternManagement.labelTemplateHeader"
              defaultMessage="Label Template"
            />
          </h3>
          <p>
            <FormattedMessage
              id="indexPatternManagement.labelTemplateLabel"
              defaultMessage="If the URL in this field is large, it might be useful to provide an alternate template for the text version
              of the URL. This will be displayed instead of the url, but will still link to the URL. The format is a string which uses
              double curly brace notation {doubleCurlyBraces} to inject values. The following values can be accessed:"
              values={{ doubleCurlyBraces: <EuiCode>{'{{ }}'}</EuiCode> }}
            />
          </p>
          <ul>
            <li>
              <EuiCode>value</EuiCode> &mdash;&nbsp;
              <FormattedMessage
                id="indexPatternManagement.labelTemplate.valueLabel"
                defaultMessage="The fields value"
              />
            </li>
            <li>
              <EuiCode>url</EuiCode> &mdash;&nbsp;
              <FormattedMessage
                id="indexPatternManagement.labelTemplate.urlLabel"
                defaultMessage="The formatted URL"
              />
            </li>
          </ul>
          <h4>
            <FormattedMessage
              id="indexPatternManagement.labelTemplate.examplesHeader"
              defaultMessage="Examples"
            />
          </h4>
          <EuiBasicTable<LabelTemplateExampleItem>
            items={items}
            columns={[
              {
                field: 'input',
                name: i18n.translate('indexPatternManagement.labelTemplate.inputHeader', {
                  defaultMessage: 'Input',
                }),
                width: '160px',
              },
              {
                field: 'urlTemplate',
                name: i18n.translate('indexPatternManagement.labelTemplate.urlHeader', {
                  defaultMessage: 'URL Template',
                }),
              },
              {
                field: 'labelTemplate',
                name: i18n.translate('indexPatternManagement.labelTemplate.labelHeader', {
                  defaultMessage: 'Label Template',
                }),
              },
              {
                field: 'output',
                name: i18n.translate('indexPatternManagement.labelTemplate.outputHeader', {
                  defaultMessage: 'Output',
                }),
                render: (value: LabelTemplateExampleItem['output']) => {
                  return (
                    <span
                      /*
                       * Justification for dangerouslySetInnerHTML:
                       * Example output produces anchor link.
                       */
                      dangerouslySetInnerHTML={{ __html: value }} // eslint-disable-line react/no-danger
                    />
                  );
                },
              },
            ]}
          />
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};

LabelTemplateFlyout.displayName = 'LabelTemplateFlyout';
