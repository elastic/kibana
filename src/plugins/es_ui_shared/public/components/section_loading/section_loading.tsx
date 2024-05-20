/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiLoadingSpinner, EuiText, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface Props {
  inline?: boolean;
  children: React.ReactNode;
  'data-test-subj'?: string;
  [key: string]: any;
}

export const SectionLoading: React.FunctionComponent<Props> = ({
  inline,
  'data-test-subj': dataTestSubj,
  children,
  ...rest
}) => {
  if (inline) {
    return (
      <EuiFlexGroup
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="s"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText {...rest}>
            <EuiTextColor color="subdued">{children}</EuiTextColor>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <KibanaPageTemplate.EmptyPrompt
      title={<EuiLoadingSpinner size="xl" />}
      body={<EuiText color="subdued">{children}</EuiText>}
      data-test-subj={dataTestSubj ?? 'sectionLoading'}
    />
  );
};
