/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EntireTimeRangePanelProps } from '../types';

export const EntireTimeRangePanel = ({
  onTimeChange,
  getEntireTimeRange,
}: EntireTimeRangePanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Abort any pending request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHoveringButton(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHoveringButton(false);
  }, []);

  const handleApplyTime = useCallback(async () => {
    try {
      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      const response = await getEntireTimeRange(abortControllerRef.current.signal);

      if (response?.start && response?.end) {
        onTimeChange({
          start: response.start,
          end: response.end,
          isInvalid: false,
          isQuickSelection: true,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      return;
    } finally {
      setIsLoading(false);
    }
  }, [onTimeChange, getEntireTimeRange]);

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLink onClick={handleApplyTime} disabled={isLoading}>
            <FormattedMessage
              id="kbnSuperDatePicker.entireTimeRangePanel.buttonLabel"
              defaultMessage="Entire time range"
            />
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexItem
            grow={false}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            css={css`
              visibility: ${isLoading ? 'visible' : 'hidden'};
            `}
          >
            <EuiButtonIcon
              isLoading={!isHoveringButton}
              iconType="cross"
              onClick={handleAbort}
              aria-label={i18n.translate(
                'kbnSuperDatePicker.entireTimeRangePanel.cancelRequestAriaLabel',
                {
                  defaultMessage: 'Cancel request',
                }
              )}
              size="xs"
              color="danger"
            />
          </EuiFlexItem>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
