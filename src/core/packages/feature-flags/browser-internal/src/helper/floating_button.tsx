/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const openHelperAriaLabel = i18n.translate('core.featureFlags.helper.openHelperAriaLabel', {
  defaultMessage: 'Open feature flags helper',
});

/** Corner button that opens the feature flags helper. Kept away from the toast region. */
export function FeatureFlagsFloatingButton({ onClick }: { onClick: () => void }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={openHelperAriaLabel} disableScreenReaderOutput>
      <EuiButtonIcon
        css={css`
          position: fixed;
          z-index: ${euiTheme.levels.toast};
          bottom: ${euiTheme.size.l};
          left: ${euiTheme.size.l};
        `}
        iconType="tableGear"
        size="m"
        display="fill"
        color="primary"
        aria-label={openHelperAriaLabel}
        data-test-subj="featureFlagsHelperButton"
        onClick={onClick}
      />
    </EuiToolTip>
  );
}
