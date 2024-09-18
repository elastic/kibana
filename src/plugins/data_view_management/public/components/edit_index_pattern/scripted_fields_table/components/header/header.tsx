/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiLink } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../../../types';

export const Header = () => {
  const { docLinks } = useKibana<IndexPatternManagmentContext>().services;
  const links = docLinks?.links;
  // todo localize
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiCallOut title="Scripted fields are deprecated." color="warning" iconType="warning">
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.deprecation.title"
            tagName="span"
            defaultMessage="Use {runtimeDocs} instead."
            values={{
              runtimeDocs: (
                <EuiLink target="_blank" href={links.indexPatterns.runtimeFields}>
                  <FormattedMessage
                    id="indexPatternManagement.header.runtimeLink"
                    defaultMessage="runtime fields"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
        <br />
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
