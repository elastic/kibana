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
import { getTimeFieldRange } from '../services/time_field_range';

export const EntireTimeRangePanel = ({
  onTimeChange,
  http,
  dataView,
  query,
}: EntireTimeRangePanelProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyTime = useCallback(async () => {
    if (!http || !dataView) {
      return;
    }

    try {
      setIsLoading(true);

      const runtimeMappings = dataView.getRuntimeMappings();
      const response = await getTimeFieldRange({
        index: dataView.getIndexPattern(),
        timeFieldName: dataView.timeFieldName,
        query,
        ...(Object.keys(runtimeMappings).length > 0 ? { runtimeMappings } : {}),
        http,
      });

      if (response.start?.string && response.end?.string) {
        onTimeChange({
          start: response.start.string,
          end: response.end.string,
          isInvalid: false,
          isQuickSelection: true,
        });
      }
    } catch (error) {
      return;
    } finally {
      setIsLoading(false);
    }
  }, [http, dataView, query, onTimeChange]);

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
