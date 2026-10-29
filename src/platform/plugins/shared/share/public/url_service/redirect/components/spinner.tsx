/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const text = i18n.translate('share.urlService.redirect.components.Spinner.label', {
  defaultMessage: 'Redirecting…',
  description: 'Redirect endpoint spinner label.',
});

// POC: showPlainSpinner kept for callers; branded elastic loader removed
export const Spinner: React.FC<{ showPlainSpinner: boolean }> = () => {
  return (
    <EuiFlexGroup justifyContent="spaceAround" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceAround" alignItems="center">
          <EuiFlexItem grow={false}>
            {/* POC: EuiLoadingElastic → EuiLoadingSpinner (ring is chrome-only) */}
            <EuiLoadingSpinner size="xxl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size={'m'}>
              {text}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
