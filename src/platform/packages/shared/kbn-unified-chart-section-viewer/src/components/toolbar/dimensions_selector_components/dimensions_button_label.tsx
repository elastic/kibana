/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiNotificationBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../common/constants';

interface DimensionsButtonLabelProps {
  count: number;
  isLoading: boolean;
}

/**
 * Content rendered inside the toolbar selector's trigger button.
 * - 0 selections: neutral "No dimensions selected" message
 * - 1+ selections: "Dimensions" + count badge
 * - Shows a loading spinner on the right while `isLoading` is true.
 */
export const DimensionsButtonLabel = ({ count, isLoading }: DimensionsButtonLabelProps) => (
  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
    <EuiFlexItem
      grow={false}
      css={css`
        align-items: flex-start;
      `}
    >
      {count === 0 ? (
        <FormattedMessage
          id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabel"
          defaultMessage="No {maxDimensions, plural, one {dimension} other {dimensions}} selected"
          values={{ maxDimensions: MAX_DIMENSIONS_SELECTIONS }}
        />
      ) : (
        <EuiFlexGroup alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="metricsExperience.dimensionsSelector.breakdownFieldButtonLabelWithSelection"
              defaultMessage="Dimensions"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge>{count}</EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexItem>
    {isLoading && (
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
