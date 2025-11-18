/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiLink, EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntireTimeRangePanelProps } from '../types';

export const EntireTimeRangePanel = ({
  onTimeChange,
  getEntireTimeRange,
}: EntireTimeRangePanelProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyTime = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await getEntireTimeRange();

      if (response?.start && response?.end) {
        onTimeChange({
          start: response.start,
          end: response.end,
          isInvalid: false,
          isQuickSelection: true,
        });
      }
    } catch (error) {
      return;
    } finally {
      setIsLoading(false);
    }
  }, [onTimeChange, getEntireTimeRange]);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={handleApplyTime} disabled={isLoading}>
            <FormattedMessage
              id="kbnSuperDatePicker.entireTimeRangePanel.buttonLabel"
              defaultMessage="Entire time range"
            />
          </EuiLink>
        </EuiFlexItem>
        {isLoading && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
