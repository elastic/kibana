/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiLink, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../../../types';

export const Header = () => {
  const { docLinks } = useKibana<IndexPatternManagmentContext>().services;
  const links = docLinks?.links;
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('indexPatternManagement.editIndexPattern.deprecation.title', {
            defaultMessage: 'Scripted fields are deprecated',
          })}
          color="warning"
          iconType="warning"
        >
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.deprecation.message"
            tagName="span"
            defaultMessage="Use {runtimeFieldsLink} instead of scripted fields. Runtime fields support Painless scripting and provide greater flexibility. You can also use the {esqlLink} to compute values directly at query time."
            values={{
              runtimeFieldsLink: (
                <EuiLink target="_blank" href={links.indexPatterns.runtimeFields}>
                  <FormattedMessage
                    id="indexPatternManagement.header.runtimeLink"
                    defaultMessage="runtime fields"
                  />
                </EuiLink>
              ),
              esqlLink: (
                <EuiLink target="_blank" href={links.query.queryESQL}>
                  <FormattedMessage
                    id="indexPatternManagement.header.esqlLink"
                    defaultMessage="Elasticsearch Query Language (ES|QL)"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              tagName="span"
              id="indexPatternManagement.editIndexPattern.scriptedLabel"
              defaultMessage="Scripted fields can be used in visualizations and displayed in documents. However, they cannot be searched."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
