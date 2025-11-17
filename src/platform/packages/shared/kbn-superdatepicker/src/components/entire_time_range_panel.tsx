/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { EuiLink, useEuiTheme, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { EntireTimeRangePanelProps } from '../types';
import { getTimeFieldRange } from '../services/time_field_range';

export const EntireTimeRangePanel = ({
  onTimeChange,
  http,
  dataView,
  query,
}: EntireTimeRangePanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [isLoading, setIsLoading] = useState(false);

  const applyTime = useCallback(
    (args: { start: string; end: string }) => {
      onTimeChange({
        start: args.start,
        end: args.end,
        isInvalid: false,
        isQuickSelection: true,
      });
    },
    [onTimeChange]
  );

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
        applyTime({
          start: response.start.string,
          end: response.end.string,
        });
      }
    } catch (error) {
      return;
    } finally {
      setIsLoading(false);
    }
  }, [applyTime, http, dataView, query]);

  const panelCss = css`
    margin-top: ${euiTheme.size.s};
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  return (
    <EuiLink onClick={handleApplyTime} css={panelCss} disabled={isLoading}>
      <FormattedMessage
        id="kbnSuperDatePicker.entireTimeRangePanel.buttonLabel"
        defaultMessage="Entire time range"
      />
      {isLoading && <EuiLoadingSpinner size="s" />}
    </EuiLink>
  );
};
