/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { EuiBasicTable, EuiCode, EuiFlyout, EuiFlyoutBody, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const UrlTemplateFlyout = ({ isVisible = false, onClose = () => {} }) => {
  return isVisible ? (
    <EuiFlyout onClose={onClose} data-test-subj={'urlTemplateFlyoutTestSubj'}>
      <EuiFlyoutBody>
        <EuiText>
          <h3>
            <FormattedMessage
              id="indexPatternManagement.urlTemplateHeader"
              defaultMessage="Url Template"
            />
          </h3>
          <p>
            <FormattedMessage
              id="indexPatternManagement.urlTemplateLabel.fieldDetail"
              defaultMessage="If a field only contains part of a URL then a {strongUrlTemplate} can be used to format the value as
              a complete URL. The format is a string which uses double curly brace notation {doubleCurlyBraces} to inject values.
              The following values can be accessed:"
              values={{
                doubleCurlyBraces: <EuiCode>{'{{ }}'}</EuiCode>,
                strongUrlTemplate: (
                  <strong>
                    <FormattedMessage
                      id="indexPatternManagement.urlTemplateLabel.strongUrlTemplateLabel"
                      defaultMessage="Url Template"
                    />
                  </strong>
                ),
              }}
            />
          </p>
          <ul>
            <li>
              <EuiCode>value</EuiCode> &mdash;&nbsp;
              <FormattedMessage
                id="indexPatternManagement.urlTemplate.valueLabel"
                defaultMessage="The URI-escaped value"
              />
            </li>
            <li>
              <EuiCode>rawValue</EuiCode> &mdash;&nbsp;
              <FormattedMessage
                id="indexPatternManagement.urlTemplate.rawValueLabel"
                defaultMessage="The unescaped value"
              />
            </li>
          </ul>
          <h4>
            <FormattedMessage
              id="indexPatternManagement.urlTemplate.examplesHeader"
              defaultMessage="Examples"
            />
          </h4>
          <EuiBasicTable
            items={[
              {
                input: 1234,
                template: 'http://company.net/profiles?user_id={{value}}',
                output: 'http://company.net/profiles?user_id=1234',
              },
              {
                input: 'users/admin',
                template: 'http://company.net/groups?id={{value}}',
                output: 'http://company.net/groups?id=users%2Fadmin',
              },
              {
                input: '/images/favicon.ico',
                template: 'http://www.site.com{{rawValue}}',
                output: 'http://www.site.com/images/favicon.ico',
              },
            ]}
            columns={[
              {
                field: 'input',
                name: i18n.translate('indexPatternManagement.urlTemplate.inputHeader', {
                  defaultMessage: 'Input',
                }),
                width: '160px',
              },
              {
                field: 'template',
                name: i18n.translate('indexPatternManagement.urlTemplate.templateHeader', {
                  defaultMessage: 'Template',
                }),
              },
              {
                field: 'output',
                name: i18n.translate('indexPatternManagement.urlTemplate.outputHeader', {
                  defaultMessage: 'Output',
                }),
              },
            ]}
          />
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : null;
};
