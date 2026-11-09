/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const badgeLabel = i18n.translate('developerToolbar.featureFlagsHelper.badgeLabel', {
  defaultMessage: 'Feature flags',
});

const openAriaLabel = i18n.translate('developerToolbar.featureFlagsHelper.openAriaLabel', {
  defaultMessage: 'Open feature flags helper',
});

/** Toolbar pill that opens the feature flags helper flyout. */
export function FeatureFlagsHelperBadge({ onClick }: { onClick: () => void }) {
  return (
    <EuiToolTip content={openAriaLabel} disableScreenReaderOutput>
      <EuiBadge
        color="#1E293B"
        iconType="tableGear"
        iconSide="left"
        onClick={onClick}
        onClickAriaLabel={openAriaLabel}
        data-test-subj="featureFlagsHelperButton"
      >
        {badgeLabel}
      </EuiBadge>
    </EuiToolTip>
  );
}
