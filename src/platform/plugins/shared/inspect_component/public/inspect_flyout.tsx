/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { OverlayFlyoutOpenOptions } from '@kbn/core/public';

interface Props {
  codeowners: string[];
}

export const flyoutOptions: OverlayFlyoutOpenOptions = {
  size: 's',
  'data-test-subj': 'inspectComponentFlyout',
};

export const InspectFlyout = ({ codeowners }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText>
          <FormattedMessage
            id="kbnInspectComponent.inspectFlyout.codeownersText"
            defaultMessage="Codeowners: {codeowners}"
            values={{ codeowners: codeowners.join(', ') }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
