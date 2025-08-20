/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  codeowners: string[];
}

export const CodeownersSection = ({ codeowners }: Props) => (
  <EuiFlexItem grow={false}>
    <EuiPanel hasShadow={false} hasBorder={true}>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.codeownersTitle"
            defaultMessage="Codeowners"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="s">
        {codeowners.length > 0
          ? codeowners.map((codeowner) => (
              <EuiFlexItem grow={false} key={codeowner}>
                <EuiText size="s">{codeowner}</EuiText>
              </EuiFlexItem>
            ))
          : null}
      </EuiFlexGroup>
    </EuiPanel>
  </EuiFlexItem>
);
